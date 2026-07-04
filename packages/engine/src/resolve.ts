import type { GameState, GameEvent } from '@sam2/shared';
import { compatDistance } from '@sam2/shared';
import type { DataIndex } from './data.js';
import { CONFIG } from './config.js';
import { nextFloat } from './rng.js';
import { officersInCity, effInt, effCha } from './state.js';

/**
 * 월 정산: 세수·수확·군량, 재해, 참모 성장, 수명(사망·후계), 모반, 달력 진행.
 * 결정론(rng 주입). 명령 페이즈가 끝난 뒤 호출한다.
 */
export function resolve(
  state: GameState,
  idx: DataIndex,
): { state: GameState; events: GameEvent[] } {
  const s = structuredClone(state);
  const events: GameEvent[] = [];
  const eco = CONFIG.economy;
  const roll = () => {
    const r = nextFloat(s.rng);
    s.rng = r.next;
    return r.value;
  };

  for (const city of Object.values(s.cities)) {
    // 세수(금)
    city.gold += Math.round(city.land * eco.taxPerLand);
    // 수확(연 1회)
    if (s.month === eco.harvestMonth) city.rice += Math.round(city.land * eco.harvestPerLand);
    // 군량 소비
    const upkeep = Math.ceil((city.soldiers / 1000) * eco.riceUpkeepPer1000Soldiers);
    city.rice -= upkeep;
    if (city.rice < 0) {
      const starved = Math.min(city.soldiers, Math.abs(city.rice) * 100);
      city.soldiers = Math.max(0, city.soldiers - starved);
      city.rice = 0;
      if (starved > 0)
        events.push({
          turn: s.turn,
          kind: 'starve',
          message: `${city.cityId} 군량 부족으로 병사 ${starved} 아사`,
        });
    }

    // 재해: 치수 낮을수록 수해 확률↑ / 역병
    const floodChance =
      CONFIG.events.floodBaseChance + (1 - city.flood / 1000) * CONFIG.events.floodDamageFactor;
    if (roll() < floodChance) {
      const lost = Math.round(city.population * CONFIG.events.floodDamageRatio);
      city.population = Math.max(0, city.population - lost);
      city.soldiers = Math.round(city.soldiers * (1 - CONFIG.events.floodDamageRatio));
      events.push({
        turn: s.turn,
        kind: 'flood',
        message: `${idx.city.get(city.cityId)?.name} 수해 발생(인구 -${lost})`,
      });
    } else if (roll() < CONFIG.events.plagueChance) {
      const lost = Math.round(city.population * CONFIG.events.plagueDamageRatio);
      city.population = Math.max(0, city.population - lost);
      events.push({
        turn: s.turn,
        kind: 'plague',
        message: `${idx.city.get(city.cityId)?.name} 역병 발생(인구 -${lost})`,
      });
    }

    // 참모 성장: 도시 최고 지력 장수가 나머지의 지력을 끌어올린다(참모 지력-1 상한)
    const here = officersInCity(s, city.cityId).map((id) => ({
      id,
      eff: effInt(s, idx.officer.get(id)?.int ?? 0, id),
    }));
    if (here.length >= 2) {
      const advisorEff = Math.max(...here.map((h) => h.eff));
      for (const h of here) {
        if (h.eff < advisorEff - 1) s.officers[h.id]!.intGrowth += CONFIG.advisorGrowth.intPerMonth;
      }
    }
  }

  // 수명: 사망 연도 도달 시 사망(군주는 후계 처리)
  handleDeaths(s, idx, events);

  // 모반: 충성이 임계 미만인 장수는 확률적으로 이탈(재야化)
  for (const o of Object.values(s.officers)) {
    if (o.dead || o.status !== 'officer') continue;
    if (o.loyalty >= CONFIG.loyalty.defectThreshold) continue;
    // 군주와 상성이 나쁠수록 이탈 확률↑
    const lordBase = o.lordId ? idx.officer.get(o.lordId) : undefined;
    const selfBase = idx.officer.get(o.officerId);
    const compatPenalty =
      lordBase && selfBase
        ? compatDistance(lordBase.compat, selfBase.compat) * CONFIG.loyalty.compatDefectFactor
        : 0;
    const chance =
      (CONFIG.loyalty.defectThreshold - o.loyalty) * CONFIG.loyalty.defectChancePerPoint +
      compatPenalty;
    if (roll() < chance) {
      const lordName = o.lordId ? idx.officer.get(o.lordId)?.name : '';
      o.status = 'free';
      o.lordId = null;
      events.push({
        turn: s.turn,
        kind: 'defect',
        message: `${idx.officer.get(o.officerId)?.name}이(가) ${lordName}을(를) 이탈해 재야가 되었다`,
      });
    }
  }

  // 달력 진행
  s.turn += 1;
  s.month += 1;
  if (s.month > 12) {
    s.month = 1;
    s.year += 1;
  }
  return { state: s, events };
}

/** 사망 연도에 도달한 장수를 사망 처리. 군주 사망 시 최고 매력 부하가 후계. */
function handleDeaths(s: GameState, idx: DataIndex, events: GameEvent[]): void {
  for (const o of Object.values(s.officers)) {
    if (o.dead) continue;
    const base = idx.officer.get(o.officerId);
    if (!base || s.year < base.diedYear) continue;
    o.dead = true;
    const name = base.name;
    if (o.status === 'lord') {
      succeed(s, idx, o.officerId, name, events);
    } else {
      events.push({ turn: s.turn, kind: 'death', message: `${name} 사망` });
      o.lordId = null;
      o.cityId = null;
      o.status = 'free';
    }
  }
}

/** 군주 사망 → 최고 매력 부하가 세력을 승계. 없으면 세력 해체(도시 중립화). */
function succeed(
  s: GameState,
  idx: DataIndex,
  oldLordId: string,
  oldName: string,
  events: GameEvent[],
): void {
  const heirs = Object.values(s.officers).filter(
    (o) => !o.dead && o.lordId === oldLordId && o.status === 'officer',
  );
  s.lords[oldLordId]!.alive = false;
  if (heirs.length === 0) {
    // 후계 없음 → 도시 중립화, 부하 재야
    for (const c of Object.values(s.cities)) if (c.lordId === oldLordId) c.lordId = null;
    events.push({
      turn: s.turn,
      kind: 'lordFall',
      message: `${oldName} 사망, 후계자가 없어 세력이 해체되었다`,
    });
    return;
  }
  heirs.sort(
    (a, b) =>
      effCha(s, idx.officer.get(b.officerId)!.cha, b.officerId) -
      effCha(s, idx.officer.get(a.officerId)!.cha, a.officerId),
  );
  const heir = heirs[0]!;
  const heirId = heir.officerId;
  // 세력 승계: 도시·부하의 소속을 후계자로 이전
  for (const c of Object.values(s.cities)) if (c.lordId === oldLordId) c.lordId = heirId;
  for (const o of Object.values(s.officers)) if (o.lordId === oldLordId) o.lordId = heirId;
  heir.status = 'lord';
  heir.lordId = heirId;
  heir.loyalty = CONFIG.loyalty.lordInit;
  s.lords[heirId] = { lordId: heirId, isHuman: s.lords[oldLordId]!.isHuman, alive: true };
  events.push({
    turn: s.turn,
    kind: 'succession',
    message: `${oldName} 사망 → ${idx.officer.get(heirId)?.name}이(가) 세력을 승계`,
  });
}

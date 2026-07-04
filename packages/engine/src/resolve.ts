import type { GameState, GameEvent } from '@sam2/shared';
import type { DataIndex } from './data.js';
import { CONFIG } from './config.js';
import { nextFloat } from './rng.js';
import { officersInCity, effInt } from './state.js';

/**
 * 월 정산: 세수·수확·군량, 참모 성장, 모반, 달력 진행. 결정론(rng 주입).
 * 명령 페이즈가 끝난 뒤 호출한다.
 */
export function resolve(
  state: GameState,
  idx: DataIndex,
): { state: GameState; events: GameEvent[] } {
  const s = structuredClone(state);
  const events: GameEvent[] = [];
  const eco = CONFIG.economy;

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

  // 모반: 충성이 임계 미만인 장수는 확률적으로 이탈(재야化)
  for (const o of Object.values(s.officers)) {
    if (o.dead || o.status !== 'officer') continue;
    if (o.loyalty >= CONFIG.loyalty.defectThreshold) continue;
    const r = nextFloat(s.rng);
    s.rng = r.next;
    const chance =
      (CONFIG.loyalty.defectThreshold - o.loyalty) * CONFIG.loyalty.defectChancePerPoint;
    if (r.value < chance) {
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

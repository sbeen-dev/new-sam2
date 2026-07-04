import type { GameState, Command, GameEvent } from '@sam2/shared';
import type { DataIndex } from '../data.js';
import { CONFIG } from '../config.js';
import { citiesOf, officersInCity, freeOfficersInCity } from '../state.js';
import { resolveBattle } from '../combat/battle.js';
import { nextFloat } from '../rng.js';

export interface ApplyResult {
  state: GameState;
  events: GameEvent[];
}

const clone = (s: GameState): GameState => structuredClone(s);

/**
 * 특정 군주가 이번 달 낼 수 있는 합법 명령 목록.
 * 에이전트/AI는 이 목록 안에서만 고른다(규칙 위반 불가).
 */
export function listLegalCommands(state: GameState, idx: DataIndex, lordId: string): Command[] {
  const cmds: Command[] = [];
  const cfg = CONFIG;
  for (const cityId of citiesOf(state, lordId)) {
    const city = state.cities[cityId]!;
    const cityAdj = idx.city.get(cityId)?.adjacent ?? [];
    const freeHere = freeOfficersInCity(state, cityId);
    const officersHere = officersInCity(state, cityId);
    for (const officerId of officersHere) {
      // 내정: 개발·치수·상업·농업
      if (city.gold >= cfg.develop.goldCost && city.land < cfg.develop.landCap)
        cmds.push({ type: 'develop', actorOfficerId: officerId, cityId, params: {} });
      if (city.gold >= cfg.floodControl.goldCost && city.flood < cfg.floodControl.floodCap)
        cmds.push({ type: 'floodControl', actorOfficerId: officerId, cityId, params: {} });
      if (city.gold >= cfg.commerce.goldCost && city.publicOrder < cfg.commerce.orderCap)
        cmds.push({ type: 'commerce', actorOfficerId: officerId, cityId, params: {} });
      if (city.gold >= cfg.farm.goldCost)
        cmds.push({ type: 'farm', actorOfficerId: officerId, cityId, params: {} });
      // 군사: 징병
      if (city.gold >= cfg.draft.goldPer1000)
        cmds.push({ type: 'draft', actorOfficerId: officerId, cityId, params: {} });
      // 인사: 등용(재야) / 포상(아군 장수)
      if (city.gold >= cfg.recruit.goldCost)
        for (const targetId of freeHere)
          cmds.push({
            type: 'recruit',
            actorOfficerId: officerId,
            cityId,
            params: { targetOfficerId: targetId },
          });
      if (city.gold >= cfg.reward.goldCost)
        for (const targetId of officersHere)
          if (state.officers[targetId]!.loyalty < cfg.reward.loyaltyCap)
            cmds.push({
              type: 'reward',
              actorOfficerId: officerId,
              cityId,
              params: { targetOfficerId: targetId },
            });
      // 이동: 인접 아군 도시로 병력 이동
      if (city.soldiers > cfg.move.keepMin)
        for (const targetId of cityAdj)
          if (state.cities[targetId]!.lordId === lordId)
            cmds.push({
              type: 'move',
              actorOfficerId: officerId,
              cityId,
              params: { targetCityId: targetId },
            });
      // 전쟁: 인접 적/중립 도시 침공
      if (city.soldiers >= cfg.combat.minInvadeSoldiers) {
        for (const targetId of cityAdj) {
          const target = state.cities[targetId]!;
          if (target.lordId !== lordId)
            cmds.push({
              type: 'invade',
              actorOfficerId: officerId,
              cityId,
              params: { targetCityId: targetId },
            });
        }
      }
    }
  }
  return cmds;
}

/** 명령 적용 (순수: 새 state와 이벤트 반환). 불법 명령은 무시 이벤트로 처리. */
export function applyCommand(state: GameState, idx: DataIndex, cmd: Command): ApplyResult {
  switch (cmd.type) {
    case 'develop':
      return applyDevelop(state, idx, cmd);
    case 'floodControl':
      return applyInternal(
        state,
        idx,
        cmd,
        'flood',
        CONFIG.floodControl.floodPerInt,
        'int',
        CONFIG.floodControl.floodCap,
        CONFIG.floodControl.goldCost,
        '치수',
      );
    case 'commerce':
      return applyInternal(
        state,
        idx,
        cmd,
        'publicOrder',
        CONFIG.commerce.orderPerCha,
        'cha',
        CONFIG.commerce.orderCap,
        CONFIG.commerce.goldCost,
        '상업',
      );
    case 'farm':
      return applyInternal(
        state,
        idx,
        cmd,
        'rice',
        CONFIG.farm.ricePerInt,
        'int',
        Number.MAX_SAFE_INTEGER,
        CONFIG.farm.goldCost,
        '농업',
      );
    case 'draft':
      return applyDraft(state, idx, cmd);
    case 'recruit':
      return applyRecruit(state, idx, cmd);
    case 'reward':
      return applyReward(state, idx, cmd);
    case 'move':
      return applyMove(state, idx, cmd);
    case 'invade':
      return applyInvade(state, idx, cmd);
    default:
      return { state, events: [evt(state, 'noop', `미구현 명령: ${cmd.type}`)] };
  }
}

function evt(
  state: GameState,
  kind: string,
  message: string,
  data?: Record<string, unknown>,
): GameEvent {
  return { turn: state.turn, kind, message, ...(data ? { data } : {}) };
}

function applyDevelop(state: GameState, idx: DataIndex, cmd: Command): ApplyResult {
  const s = clone(state);
  const city = s.cities[cmd.cityId]!;
  const actor = idx.officer.get(cmd.actorOfficerId)!;
  if (city.gold < CONFIG.develop.goldCost) return { state, events: [] };
  city.gold -= CONFIG.develop.goldCost;
  const gain = Math.round(actor.int * CONFIG.develop.landPerInt);
  city.land = Math.min(CONFIG.develop.landCap, city.land + gain);
  return {
    state: s,
    events: [
      evt(
        s,
        'develop',
        `${actor.name}이(가) ${idx.city.get(cmd.cityId)?.name} 개발(토지 +${gain})`,
      ),
    ],
  };
}

function applyDraft(state: GameState, idx: DataIndex, cmd: Command): ApplyResult {
  const s = clone(state);
  const city = s.cities[cmd.cityId]!;
  const actor = idx.officer.get(cmd.actorOfficerId)!;
  const cap = Math.floor(city.population * CONFIG.draft.maxPopulationRatio);
  const room = Math.max(0, cap - city.soldiers);
  if (room <= 0 || city.gold < CONFIG.draft.goldPer1000) return { state, events: [] };
  let recruits = Math.round(actor.cha * CONFIG.draft.soldiersPerCha);
  recruits = Math.min(recruits, room, Math.floor(city.gold / CONFIG.draft.goldPer1000) * 1000);
  city.soldiers += recruits;
  city.gold -= Math.ceil(recruits / 1000) * CONFIG.draft.goldPer1000;
  return {
    state: s,
    events: [
      evt(
        s,
        'draft',
        `${actor.name}이(가) ${idx.city.get(cmd.cityId)?.name} 징병(병사 +${recruits})`,
      ),
    ],
  };
}

/** 내정 공통: 도시 지표를 담당 장수 능력치에 비례해 올린다(치수·상업·농업). */
function applyInternal(
  state: GameState,
  idx: DataIndex,
  cmd: Command,
  field: 'flood' | 'publicOrder' | 'rice',
  perStat: number,
  stat: 'int' | 'cha',
  cap: number,
  goldCost: number,
  label: string,
): ApplyResult {
  const s = clone(state);
  const city = s.cities[cmd.cityId]!;
  const actor = idx.officer.get(cmd.actorOfficerId)!;
  if (city.gold < goldCost) return { state, events: [] };
  city.gold -= goldCost;
  const gain = Math.round(actor[stat] * perStat);
  city[field] = Math.min(cap, city[field] + gain);
  return {
    state: s,
    events: [
      evt(
        s,
        'internal',
        `${actor.name}이(가) ${idx.city.get(cmd.cityId)?.name} ${label}(+${gain})`,
      ),
    ],
  };
}

/** 등용: 도시의 재야 장수를 매력·난수로 영입 시도. */
function applyRecruit(state: GameState, idx: DataIndex, cmd: Command): ApplyResult {
  const s = clone(state);
  const city = s.cities[cmd.cityId]!;
  const actor = idx.officer.get(cmd.actorOfficerId)!;
  const targetId = String(cmd.params.targetOfficerId);
  const target = s.officers[targetId];
  if (!target || target.status !== 'free' || target.cityId !== cmd.cityId)
    return { state, events: [] };
  if (city.gold < CONFIG.recruit.goldCost) return { state, events: [] };
  city.gold -= CONFIG.recruit.goldCost;
  const r = nextRoll(s);
  s.rng = r.rng;
  const chance = CONFIG.recruit.baseChance + actor.cha / CONFIG.recruit.chaDivisor;
  const targetName = idx.officer.get(targetId)?.name;
  if (r.value < chance) {
    target.status = 'officer';
    target.lordId = city.lordId;
    target.loyalty = CONFIG.loyalty.officerInit;
    return {
      state: s,
      events: [evt(s, 'recruit', `${actor.name}이(가) 재야 ${targetName}을(를) 등용했다`)],
    };
  }
  return { state: s, events: [evt(s, 'recruitFail', `${targetName} 등용 실패`)] };
}

/** 포상: 아군 장수의 충성도를 올린다. */
function applyReward(state: GameState, idx: DataIndex, cmd: Command): ApplyResult {
  const s = clone(state);
  const city = s.cities[cmd.cityId]!;
  const targetId = String(cmd.params.targetOfficerId);
  const target = s.officers[targetId];
  if (!target || city.gold < CONFIG.reward.goldCost) return { state, events: [] };
  city.gold -= CONFIG.reward.goldCost;
  target.loyalty = Math.min(CONFIG.reward.loyaltyCap, target.loyalty + CONFIG.reward.loyaltyGain);
  return {
    state: s,
    events: [
      evt(s, 'reward', `${idx.officer.get(targetId)?.name}에게 포상(충성 ${target.loyalty})`),
    ],
  };
}

/** 이동: 인접 아군 도시로 병력의 절반을 이동. */
function applyMove(state: GameState, idx: DataIndex, cmd: Command): ApplyResult {
  const targetId = String(cmd.params.targetCityId);
  const s = clone(state);
  const from = s.cities[cmd.cityId]!;
  const target = s.cities[targetId];
  if (!target || target.lordId !== from.lordId) return { state, events: [] };
  const moved = Math.floor((from.soldiers - CONFIG.move.keepMin) / 2);
  if (moved <= 0) return { state, events: [] };
  from.soldiers -= moved;
  target.soldiers += moved;
  return {
    state: s,
    events: [
      evt(
        s,
        'move',
        `${idx.city.get(cmd.cityId)?.name}→${idx.city.get(targetId)?.name} 병력 ${moved} 이동`,
      ),
    ],
  };
}

/** rng 소비 헬퍼: [0,1) 값과 다음 rng */
function nextRoll(s: GameState): { value: number; rng: GameState['rng'] } {
  const r = nextFloat(s.rng);
  return { value: r.value, rng: r.next };
}

function applyInvade(state: GameState, idx: DataIndex, cmd: Command): ApplyResult {
  const targetId = String(cmd.params.targetCityId);
  const s = clone(state);
  const from = s.cities[cmd.cityId]!;
  const target = s.cities[targetId]!;
  const actor = idx.officer.get(cmd.actorOfficerId)!;
  if (from.soldiers < CONFIG.combat.minInvadeSoldiers) return { state, events: [] };

  const attacking = from.soldiers;
  const { outcome, rng } = resolveBattle(s, idx, cmd.cityId, targetId, attacking);
  s.rng = rng;
  from.soldiers = Math.max(0, from.soldiers - outcome.attackerLosses);

  const fromName = idx.city.get(cmd.cityId)?.name;
  const targetName = idx.city.get(targetId)?.name;
  const events: GameEvent[] = [];

  // 일기토 결과 기록
  if (outcome.duel) {
    const a = idx.officer.get(outcome.duel.attackerOfficerId)?.name;
    const d = idx.officer.get(outcome.duel.defenderOfficerId)?.name;
    const winner = outcome.duel.attackerWon ? a : d;
    events.push(evt(s, 'duel', `일기토: ${a} vs ${d} — ${winner} 승리`));
  }

  if (outcome.attackerWins) {
    const moved = Math.round(
      (attacking - outcome.attackerLosses) * CONFIG.combat.attackerMoveRatio,
    );
    from.soldiers -= moved;
    target.soldiers = moved;
    const prevOwner = target.lordId;
    target.lordId = from.lordId;
    // 점령지로 지휘 장수 이동
    s.officers[actor.id] = { ...s.officers[actor.id]!, cityId: targetId };
    events.push(
      evt(s, 'conquer', `${actor.name}이(가) ${fromName}→${targetName} 침공 성공, 점령`, {
        prevOwner,
      }),
    );
    // 정복당한 군주가 도시를 모두 잃으면 사망 처리
    if (prevOwner && !Object.values(s.cities).some((c) => c.lordId === prevOwner)) {
      s.lords[prevOwner] = { ...s.lords[prevOwner]!, alive: false };
      events.push(evt(s, 'lordFall', `${idx.officer.get(prevOwner)?.name} 세력이 멸망했다`));
    }
  } else {
    target.soldiers = Math.max(0, target.soldiers - outcome.defenderLosses);
    events.push(
      evt(
        s,
        'repelled',
        `${actor.name}의 ${targetName} 침공 실패(병사 -${outcome.attackerLosses})`,
      ),
    );
  }
  return { state: s, events };
}

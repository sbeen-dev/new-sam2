import type { GameState, Command, GameEvent } from '@sam2/shared';
import type { DataIndex } from '../data.js';
import { CONFIG } from '../config.js';
import { citiesOf, officersInCity } from '../state.js';
import { resolveBattle } from '../combat/battle.js';

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
    for (const officerId of officersInCity(state, cityId)) {
      // 내정: 개발
      if (city.gold >= cfg.develop.goldCost && city.land < cfg.develop.landCap)
        cmds.push({ type: 'develop', actorOfficerId: officerId, cityId, params: {} });
      // 군사: 징병
      if (city.gold >= cfg.draft.goldPer1000)
        cmds.push({ type: 'draft', actorOfficerId: officerId, cityId, params: {} });
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
    case 'draft':
      return applyDraft(state, idx, cmd);
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

import type { GameState } from '@sam2/shared';
import type { DataIndex } from '../data.js';
import { CONFIG } from '../config.js';
import { nextFloat } from '../rng.js';
import { officersInCity } from '../state.js';

export interface BattleOutcome {
  attackerWins: boolean;
  attackerLosses: number;
  defenderLosses: number;
}

/** 도시의 최고 무력(주재 장수 기준). 장수 없으면 0. */
function topWar(state: GameState, idx: DataIndex, cityId: string): number {
  const wars = officersInCity(state, cityId).map((oid) => idx.officer.get(oid)?.war ?? 0);
  return wars.length ? Math.max(...wars) : 0;
}

/**
 * 결정론 전투: 병력 × (1 + 최고무력 보정) × 난수변동으로 전투력 비교.
 * rng 상태를 소비하므로 새 state.rng를 함께 반환한다.
 */
export function resolveBattle(
  state: GameState,
  idx: DataIndex,
  attackerCityId: string,
  defenderCityId: string,
  attackingSoldiers: number,
): { outcome: BattleOutcome; rng: GameState['rng'] } {
  const def = state.cities[defenderCityId]!;
  const atkWar = topWar(state, idx, attackerCityId);
  const defWar = topWar(state, idx, defenderCityId);

  const r1 = nextFloat(state.rng);
  const r2 = nextFloat(r1.next);
  const jitter = (r: number) => 1 + (r * 2 - 1) * CONFIG.combat.rngJitter;

  const atkPower = attackingSoldiers * (1 + atkWar * CONFIG.combat.warBonus) * jitter(r1.value);
  const defPower = def.soldiers * (1 + defWar * CONFIG.combat.warBonus) * jitter(r2.value);

  const attackerWins = atkPower > defPower;
  // 패배 측은 병력 대부분 소멸, 승리 측은 전투력 비율만큼 손실
  const ratio = Math.min(1, defPower / Math.max(1, atkPower));
  const outcome: BattleOutcome = attackerWins
    ? {
        attackerWins: true,
        attackerLosses: Math.round(attackingSoldiers * 0.4 * ratio),
        defenderLosses: def.soldiers,
      }
    : {
        attackerWins: false,
        attackerLosses: Math.round(attackingSoldiers * (0.6 + 0.4 * (1 - ratio))),
        defenderLosses: Math.round(def.soldiers * 0.3),
      };

  return { outcome, rng: r2.next };
}

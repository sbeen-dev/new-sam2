import type { GameState, RngState } from '@sam2/shared';
import type { DataIndex } from '../data.js';
import { CONFIG } from '../config.js';
import { nextFloat } from '../rng.js';
import { officersInCity, effWar } from '../state.js';

export interface DuelResult {
  attackerOfficerId: string;
  defenderOfficerId: string;
  attackerWon: boolean;
  /** 약자(무력 낮은 쪽)가 이겼을 때 승자의 무력 성장치 */
  warGain: number;
}

export interface BattleOutcome {
  attackerWins: boolean;
  attackerLosses: number;
  defenderLosses: number;
  duel: DuelResult | null;
}

/** 도시의 최고 무력 장수. 장수 없으면 null. */
function topWarOfficer(
  state: GameState,
  idx: DataIndex,
  cityId: string,
): { id: string; war: number } | null {
  let best: { id: string; war: number } | null = null;
  for (const oid of officersInCity(state, cityId)) {
    const war = effWar(state, idx.officer.get(oid)?.war ?? 0, oid);
    if (!best || war > best.war) best = { id: oid, war };
  }
  return best;
}

/**
 * 결정론 전투. 침공 시 먼저 일기토(양측 최고무력 장수 1:1)를 치르고,
 * 승리 진영은 전투력 보정을 받는다. 이후 병력×무력보정×난수로 승패를 가른다.
 * rng 상태를 소비하므로 새 rng를 함께 반환한다.
 */
export function resolveBattle(
  state: GameState,
  idx: DataIndex,
  attackerCityId: string,
  defenderCityId: string,
  attackingSoldiers: number,
): { outcome: BattleOutcome; rng: RngState } {
  const def = state.cities[defenderCityId]!;
  const atkOfficer = topWarOfficer(state, idx, attackerCityId);
  const defOfficer = topWarOfficer(state, idx, defenderCityId);
  const atkWar = atkOfficer?.war ?? 0;
  const defWar = defOfficer?.war ?? 0;

  let rng = state.rng;
  const roll = () => {
    const r = nextFloat(rng);
    rng = r.next;
    return r.value;
  };

  // 일기토: 양측 장수가 있을 때만. 무력에 난수 가중해 겨룬다.
  let duel: DuelResult | null = null;
  let atkDuelBonus = 1;
  let defDuelBonus = 1;
  if (atkOfficer && defOfficer) {
    const atkScore = atkWar * (0.75 + 0.5 * roll());
    const defScore = defWar * (0.75 + 0.5 * roll());
    const attackerWon = atkScore >= defScore;
    // 약자가 이기면 무력 차이만큼 성장(RTK2 규칙)
    const winnerWar = attackerWon ? atkWar : defWar;
    const loserWar = attackerWon ? defWar : atkWar;
    const warGain = loserWar > winnerWar ? loserWar - winnerWar : 0;
    duel = {
      attackerOfficerId: atkOfficer.id,
      defenderOfficerId: defOfficer.id,
      attackerWon,
      warGain,
    };
    if (attackerWon) atkDuelBonus += CONFIG.combat.duelWinnerBonus;
    else defDuelBonus += CONFIG.combat.duelWinnerBonus;
  }

  const jitter = () => 1 + (roll() * 2 - 1) * CONFIG.combat.rngJitter;
  const atkPower =
    attackingSoldiers * (1 + atkWar * CONFIG.combat.warBonus) * atkDuelBonus * jitter();
  const defPower = def.soldiers * (1 + defWar * CONFIG.combat.warBonus) * defDuelBonus * jitter();

  const attackerWins = atkPower > defPower;
  const ratio = Math.min(1, defPower / Math.max(1, atkPower));
  const outcome: BattleOutcome = attackerWins
    ? {
        attackerWins: true,
        attackerLosses: Math.round(attackingSoldiers * 0.4 * ratio),
        defenderLosses: def.soldiers,
        duel,
      }
    : {
        attackerWins: false,
        attackerLosses: Math.round(attackingSoldiers * (0.6 + 0.4 * (1 - ratio))),
        defenderLosses: Math.round(def.soldiers * 0.3),
        duel,
      };

  return { outcome, rng };
}

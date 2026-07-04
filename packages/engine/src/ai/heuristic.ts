import type { GameState, Command } from '@sam2/shared';
import type { DataIndex } from '../data.js';
import { listLegalCommands } from '../commands/index.js';
import { CONFIG } from '../config.js';

/**
 * LLM 없이 동작하는 규칙기반 군주 AI (폴백/기본 플레이용).
 * 장수 1명당 명령 1개를 우선순위로 선택한다:
 *   1) 유리한 인접 약체 → 침공
 *   2) 후방(적 인접 없음)에서 병력 여유 → 전선 아군 도시로 이동(증원)
 *   3) 병력 부족 → 징병
 *   4) 재야 장수 있으면 → 등용(인재 확보)
 *   5) 그 외 → 내정(개발/치수/상업/농업 순환)
 * 결정론: 같은 상태 → 같은 선택(난수 미사용).
 */
export function heuristicDecide(state: GameState, idx: DataIndex, lordId: string): Command[] {
  const legal = listLegalCommands(state, idx, lordId);
  const byOfficer = new Map<string, Command[]>();
  for (const c of legal) {
    const list = byOfficer.get(c.actorOfficerId) ?? [];
    list.push(c);
    byOfficer.set(c.actorOfficerId, list);
  }

  const chosen: Command[] = [];
  let internalTick = 0;
  const movedFrom = new Set<string>(); // 도시당 이동 1회로 제한(로그 도배 방지)
  for (const [, options] of byOfficer) {
    const cityId = options[0]!.cityId;
    const city = state.cities[cityId]!;
    const cap = city.population * CONFIG.draft.maxPopulationRatio;
    const hasEnemyNeighbor = adjacentEnemy(state, idx, cityId, lordId);

    const invade = pickBestInvade(state, options);
    if (invade) {
      chosen.push(invade);
      continue;
    }
    // 후방 여유 병력을 전선으로 증원(도시당 1회)
    if (!hasEnemyNeighbor && !movedFrom.has(cityId)) {
      const reinforce = pickReinforce(state, idx, options, lordId);
      if (reinforce) {
        movedFrom.add(cityId);
        chosen.push(reinforce);
        continue;
      }
    }
    // 전선인데 병력 부족 → 징병
    const draft = options.find((o) => o.type === 'draft');
    if (draft && city.soldiers < cap * 0.6) {
      chosen.push(draft);
      continue;
    }
    // 재야 등용
    const recruit = options.find((o) => o.type === 'recruit');
    if (recruit) {
      chosen.push(recruit);
      continue;
    }
    // 내정 순환
    const internalOrder = ['develop', 'farm', 'commerce', 'floodControl'] as const;
    const pick = internalOrder[internalTick % internalOrder.length];
    internalTick += 1;
    const internal =
      options.find((o) => o.type === pick) ?? options.find((o) => o.type === 'develop');
    chosen.push(internal ?? draft ?? options[0]!);
  }
  return chosen;
}

/** 도시가 적/중립과 인접해 있는가(전선 여부) */
function adjacentEnemy(state: GameState, idx: DataIndex, cityId: string, lordId: string): boolean {
  const adj = idx.city.get(cityId)?.adjacent ?? [];
  return adj.some((a) => state.cities[a]!.lordId !== lordId);
}

// AI는 수비 홈 이점을 감안해 우세(수비의 약 1.45배 + 여유 병력)일 때 침공.
// 너무 크면 교착(미통일), 너무 작으면 국경 반복 점령 → 중간값.
const INVADE_FORCE_RATIO = 1.45;
const INVADE_MIN_MARGIN = 1800;

/** 방어 병력 대비 확실히 우세한 인접 도시만 노린다(무모한 침공·국경 반복 점령 방지). */
function pickBestInvade(state: GameState, options: Command[]): Command | null {
  const invades = options.filter((o) => o.type === 'invade');
  let best: Command | null = null;
  let bestGap = INVADE_MIN_MARGIN;
  for (const inv of invades) {
    const from = state.cities[inv.cityId]!;
    const target = state.cities[String(inv.params.targetCityId)]!;
    const gap = from.soldiers - target.soldiers * INVADE_FORCE_RATIO;
    if (gap > bestGap) {
      bestGap = gap;
      best = inv;
    }
  }
  return best;
}

/** 후방 도시에서 전선(적 인접) 아군 도시로 병력 이동 */
function pickReinforce(
  state: GameState,
  idx: DataIndex,
  options: Command[],
  lordId: string,
): Command | null {
  for (const mv of options.filter((o) => o.type === 'move')) {
    const to = String(mv.params.targetCityId);
    if (adjacentEnemy(state, idx, to, lordId)) return mv;
  }
  return null;
}

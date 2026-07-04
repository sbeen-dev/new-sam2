import type { GameState, Command } from '@sam2/shared';
import type { DataIndex } from '../data.js';
import { listLegalCommands } from '../commands/index.js';
import { CONFIG } from '../config.js';

/**
 * LLM 없이 동작하는 규칙기반 군주 AI (폴백/기본 플레이용).
 * 장수 1명당 명령 1개를 선택한다:
 *   1) 병력 충분 + 유리한 인접 약체 → 침공
 *   2) 병력 부족 → 징병
 *   3) 그 외 → 개발
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
  for (const [, options] of byOfficer) {
    const invade = pickBestInvade(state, options);
    if (invade) {
      chosen.push(invade);
      continue;
    }
    const city = state.cities[options[0]!.cityId]!;
    const cap = city.population * CONFIG.draft.maxPopulationRatio;
    const draft = options.find((o) => o.type === 'draft');
    if (draft && city.soldiers < cap * 0.6) {
      chosen.push(draft);
      continue;
    }
    const develop = options.find((o) => o.type === 'develop');
    chosen.push(develop ?? draft ?? options[0]!);
  }
  return chosen;
}

/** 방어 병력이 자기보다 확실히 적은 인접 도시만 노린다(무모한 침공 방지). */
function pickBestInvade(state: GameState, options: Command[]): Command | null {
  const invades = options.filter((o) => o.type === 'invade');
  let best: Command | null = null;
  let bestGap = 0;
  for (const inv of invades) {
    const from = state.cities[inv.cityId]!;
    const target = state.cities[String(inv.params.targetCityId)]!;
    const gap = from.soldiers - target.soldiers * 1.3;
    if (gap > bestGap) {
      bestGap = gap;
      best = inv;
    }
  }
  return best;
}

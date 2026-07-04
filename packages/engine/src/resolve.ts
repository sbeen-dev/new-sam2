import type { GameState, GameEvent } from '@sam2/shared';
import { CONFIG } from './config.js';

/**
 * 월 정산: 세수·수확·군량 소비 후 달력 진행. 결정론.
 * 명령 페이즈가 끝난 뒤 호출한다.
 */
export function resolve(state: GameState): { state: GameState; events: GameEvent[] } {
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
      // 군량 부족 → 병사 아사
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

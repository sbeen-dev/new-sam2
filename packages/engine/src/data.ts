import type { Officer, City, Scenario, Item } from '@sam2/shared';

/** 엔진이 소비하는 정적 게임 데이터 묶음. 로딩 방식(fs/번들)은 주입해 엔진을 순수하게 유지. */
export interface GameData {
  officers: Officer[];
  cities: City[];
  scenarios: Scenario[];
  items: Item[];
}

/** id → 항목 조회용 인덱스 */
export interface DataIndex {
  officer: Map<string, Officer>;
  city: Map<string, City>;
  scenario: Map<string, Scenario>;
  item: Map<string, Item>;
}

export function indexData(data: GameData): DataIndex {
  return {
    officer: new Map(data.officers.map((o) => [o.id, o])),
    city: new Map(data.cities.map((c) => [c.id, c])),
    scenario: new Map(data.scenarios.map((s) => [s.id, s])),
    item: new Map(data.items.map((i) => [i.id, i])),
  };
}

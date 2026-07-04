/** 도시 초기 수치 (시나리오 스냅샷) */
export interface ScenarioCityInit {
  cityId: string;
  gold: number;
  rice: number;
  soldiers: number;
  land: number;
  flood: number;
  population: number;
  publicOrder: number;
}

/** 한 세력의 초기 배치 */
export interface ScenarioLord {
  lordId: string;
  cities: ScenarioCityInit[];
  /** 초기 소속 장수 id (군주 포함) */
  officers: string[];
}

/** 시나리오 = 정적 데이터에 초기 런타임을 입히는 스냅샷 */
export interface Scenario {
  id: string;
  year: number;
  title: string;
  /** 선택 가능한 군주 officer id */
  playableLords: string[];
  lords: ScenarioLord[];
}

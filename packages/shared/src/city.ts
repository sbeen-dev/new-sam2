/** 도시(주, 州) 정적 지리 데이터 (data/cities.json) */
export interface City {
  /** 안정적 식별자 (예: "luoyang") */
  id: string;
  /** 표시명 (낙양) */
  name: string;
  /** 인접 도시 id (침공·이동 경로). 대칭이어야 함(검증). */
  adjacent: string[];
  /** 지도 좌표(정규화 0..1) */
  x: number;
  y: number;
}

/** 도시 런타임 상태 (세이브) */
export interface CityState {
  cityId: string;
  lordId: string | null;
  gold: number;
  rice: number;
  /** 주둔 병사 수 */
  soldiers: number;
  /** 토지/개발도 0..1000 */
  land: number;
  /** 치수 0..1000 */
  flood: number;
  population: number;
  /** 민심/치안 1..100 */
  publicOrder: number;
}

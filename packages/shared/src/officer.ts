/** 능력치·신분 범위 상수 (매직넘버 금지 — coding-standards) */
export const STAT_MIN = 1;
export const STAT_MAX = 100;
export const LOYALTY_MIN = 1;
export const LOYALTY_MAX = 100;

/** 장수 정적 데이터 (data/officers.json). 원작 수치가 아닌 역사 기반 재구성값. */
export interface Officer {
  /** 안정적 식별자 (예: "cao_cao") */
  id: string;
  /** 표시명 (조조) */
  name: string;
  /** 지력 1..100 */
  int: number;
  /** 무력 1..100 */
  war: number;
  /** 매력 1..100 */
  cha: number;
  bornYear: number;
  diedYear: number;
}

export type OfficerStatus = 'lord' | 'officer' | 'free' | 'captive';

/** 장수 런타임 상태 (세이브에 저장). 정적 데이터와 분리. */
export interface OfficerState {
  officerId: string;
  lordId: string | null;
  cityId: string | null;
  loyalty: number;
  status: OfficerStatus;
  /** 무력 성장치(일기토 승리로 누적). 실효 무력 = 정적 war + warGrowth */
  warGrowth: number;
  /** 지력 성장치(참모 성장으로 누적). 실효 지력 = 정적 int + intGrowth */
  intGrowth: number;
  /** 포로일 때, 사로잡은 군주 id */
  captorId: string | null;
  /** 사망(수명/참수) 여부. true면 게임에서 제외. */
  dead: boolean;
}

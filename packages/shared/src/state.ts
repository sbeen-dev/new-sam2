import type { CityState } from './city.js';
import type { OfficerState } from './officer.js';
import type { GameEvent } from './command.js';

/** 결정론 난수 상태 (엔진이 소유; 전역 Math.random 금지) */
export interface RngState {
  seed: number;
  /** 내부 카운터 — 재현성 위해 상태로 보존 */
  counter: number;
}

export interface LordState {
  lordId: string;
  isHuman: boolean;
  alive: boolean;
}

export type DiplomacyStatus = 'neutral' | 'allied' | 'war';

export interface DiplomacyState {
  /** "lordA:lordB" -> 상태 (키는 정렬된 쌍) */
  relations: Record<string, DiplomacyStatus>;
}

/** 게임 전체 가변 상태 (세이브 단위). 진실의 원천. */
export interface GameState {
  scenarioId: string;
  /** 통산 개월 수 */
  turn: number;
  year: number;
  month: number;
  rng: RngState;
  lords: Record<string, LordState>;
  cities: Record<string, CityState>;
  officers: Record<string, OfficerState>;
  diplomacy: DiplomacyState;
  log: GameEvent[];
}

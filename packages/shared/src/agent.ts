import type { Command } from './command.js';

/** 군주 성격/전략 성향 — 프롬프트에 주입되어 다양성을 만든다 */
export interface Persona {
  lordId: string;
  /** 표시명 */
  name: string;
  /** 0..1: 공격성 / 확장욕 / 위험선호 / 외교선호 / 인재중시 */
  aggression: number;
  expansion: number;
  riskTolerance: number;
  diplomacy: number;
  talentFocus: number;
  /** 캐릭터 성격 서술(연의 기반) */
  bio: string;
}

/** 에이전트가 관측하는 상태(안개 포함 가능). 엔진 observe()가 생성. */
export interface Observation {
  lordId: string;
  turn: number;
  year: number;
  month: number;
  /** 자기 세력 요약 */
  self: {
    cities: Array<{ cityId: string; name: string; gold: number; rice: number; soldiers: number }>;
    officers: Array<{ officerId: string; name: string; int: number; war: number; cha: number }>;
  };
  /** 알려진 이웃/적 요약(정보 비대칭) */
  neighbors: Array<{ cityId: string; name: string; lordId: string | null; est: string }>;
}

/** 에이전트 판단 결과 */
export interface AgentDecision {
  commands: Command[];
  rationale?: string;
}

export interface AgentBudget {
  maxTokens: number;
  timeoutMs: number;
}

/** 군주 에이전트 인터페이스 — LLM/휴리스틱 구현이 이걸 만족 */
export interface WarlordAgent {
  decide(input: {
    observation: Observation;
    legalCommands: Command[];
    persona: Persona;
    budget: AgentBudget;
  }): Promise<AgentDecision>;
}

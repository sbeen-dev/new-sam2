/**
 * @sam2/engine — 삼국지2 결정론 게임 규칙 엔진 공개 API.
 * LLM/네트워크 없음. 데이터는 주입(GameData). Node 로더는 '@sam2/engine/node'.
 */
export type { GameData, DataIndex } from './data.js';
export { indexData } from './data.js';
export { CONFIG } from './config.js';
export { createRng, nextFloat, nextInt } from './rng.js';
export { loadScenario } from './scenario.js';
export {
  citiesOf,
  officersInCity,
  freeOfficersInCity,
  activeLords,
  checkVictory,
  getRelation,
  relationKey,
} from './state.js';
export { listLegalCommands, applyCommand } from './commands/index.js';
export type { ApplyResult } from './commands/index.js';
export { resolveBattle } from './combat/battle.js';
export type { BattleOutcome, DuelResult } from './combat/battle.js';
export { resolve } from './resolve.js';
export { heuristicDecide } from './ai/heuristic.js';
export { applyCommands, runTurn } from './game.js';

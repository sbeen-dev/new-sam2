import type { GameState, Command, GameEvent } from '@sam2/shared';
import type { DataIndex } from './data.js';
import { applyCommand } from './commands/index.js';
import { resolve } from './resolve.js';
import { activeLords, checkVictory } from './state.js';
import { heuristicDecide } from './ai/heuristic.js';

/** 한 군주의 명령 목록을 순서대로 적용 */
export function applyCommands(
  state: GameState,
  idx: DataIndex,
  commands: Command[],
): { state: GameState; events: GameEvent[] } {
  let s = state;
  const events: GameEvent[] = [];
  for (const cmd of commands) {
    const r = applyCommand(s, idx, cmd);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

/**
 * 한 달(턴) 진행: 생존 군주 순서대로 결정→적용, 마지막에 월 정산.
 * decide 콜백을 주입해 AI(휴리스틱/LLM에이전트)를 교체할 수 있다.
 */
export function runTurn(
  state: GameState,
  idx: DataIndex,
  decide: (s: GameState, lordId: string) => Command[] = (s, lid) => heuristicDecide(s, idx, lid),
): { state: GameState; events: GameEvent[]; winner: string | null } {
  let s = state;
  const events: GameEvent[] = [];
  for (const lordId of activeLords(s)) {
    if (s.lords[lordId]?.isHuman) continue; // 사람 차례는 외부에서 명령 주입
    const commands = decide(s, lordId);
    const r = applyCommands(s, idx, commands);
    s = r.state;
    events.push(...r.events);
    const w = checkVictory(s);
    if (w) return { state: s, events, winner: w };
  }
  const resolved = resolve(s, idx);
  s = resolved.state;
  events.push(...resolved.events);
  return { state: s, events, winner: checkVictory(s) };
}

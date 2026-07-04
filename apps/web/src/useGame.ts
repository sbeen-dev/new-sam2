import { useMemo, useState, useCallback } from 'react';
import type { GameState, Command, GameEvent, Officer, City } from '@sam2/shared';
import { loadGameData } from '@sam2/engine/web';
import { indexData, loadScenario, runTurn, applyCommands, listLegalCommands } from '@sam2/engine';

const SEED = 20260704;

export interface GameApi {
  state: GameState;
  officer: (id: string) => Officer | undefined;
  city: (id: string) => City | undefined;
  cities: City[];
  events: GameEvent[];
  winner: string | null;
  humanLordId: string | null;
  legalFor: (lordId: string) => Command[];
  /** 플레이어 명령 즉시 적용 */
  issue: (cmd: Command) => void;
  /** 한 달 진행: AI 세력 처리 + 정산 */
  nextMonth: () => void;
}

export function useGame(scenarioId: string, humanLordId: string | null): GameApi {
  const data = useMemo(() => loadGameData(), []);
  const idx = useMemo(() => indexData(data), [data]);

  const [state, setState] = useState<GameState>(() => {
    const s = loadScenario(data, scenarioId, SEED);
    if (humanLordId && s.lords[humanLordId]) s.lords[humanLordId].isHuman = true;
    return s;
  });
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [winner, setWinner] = useState<string | null>(null);

  const issue = useCallback(
    (cmd: Command) => {
      setState((prev) => {
        const r = applyCommands(prev, idx, [cmd]);
        if (r.events.length) setEvents((e) => [...r.events, ...e].slice(0, 200));
        return r.state;
      });
    },
    [idx],
  );

  const nextMonth = useCallback(() => {
    setState((prev) => {
      if (winner) return prev;
      const r = runTurn(prev, idx);
      setEvents((e) => [...r.events, ...e].slice(0, 200));
      if (r.winner) setWinner(r.winner);
      return r.state;
    });
  }, [idx, winner]);

  return {
    state,
    officer: (id) => idx.officer.get(id),
    city: (id) => idx.city.get(id),
    cities: data.cities,
    events,
    winner,
    humanLordId,
    legalFor: (lordId) => listLegalCommands(state, idx, lordId),
    issue,
    nextMonth,
  };
}

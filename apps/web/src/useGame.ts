import { useMemo, useState, useCallback, useRef } from 'react';
import type { GameState, Command, GameEvent, Officer, City } from '@sam2/shared';
import { loadGameData } from '@sam2/engine/web';
import { indexData, loadScenario, runTurn, applyCommands, listLegalCommands } from '@sam2/engine';
import { buildCustomData, type CustomLord } from './customGame';

const SEED = 20260704;
const SAVE_KEY = 'sam2-save-v1';

interface SaveData {
  scenarioId: string;
  humanLordId: string | null;
  state: GameState;
  events: GameEvent[];
  winner: string | null;
}

export interface GameApi {
  state: GameState;
  officer: (id: string) => Officer | undefined;
  city: (id: string) => City | undefined;
  cities: City[];
  events: GameEvent[];
  winner: string | null;
  humanLordId: string | null;
  /** 직전 턴에 소유가 바뀐 도시(점령 연출용) */
  flashedCities: string[];
  /** 이번 턴에 이미 행동한 장수 id (장수 1명=그달 1회) */
  actedOfficers: string[];
  legalFor: (lordId: string) => Command[];
  /** 플레이어 명령 즉시 적용. 그 명령이 만든 이벤트를 반환(전투 연출 등에 사용). */
  issue: (cmd: Command) => GameEvent[];
  /** 한 달 진행: AI 세력 처리 + 정산 */
  nextMonth: () => void;
  /** 현재 국면을 브라우저에 저장 */
  save: () => void;
  /** 저장된 국면 불러오기 (없으면 false) */
  load: () => boolean;
  hasSave: boolean;
  /** 직전 턴에 내 도시가 적에게 함락됐을 때의 이벤트(방어 연출). 없으면 null */
  defenseAlert: GameEvent[] | null;
  clearDefenseAlert: () => void;
}

export function useGame(
  scenarioId: string,
  humanLordId: string | null,
  custom?: CustomLord,
): GameApi {
  // custom은 시작 시 1회 고정되므로 scenarioId 기준으로만 재계산한다.
  const data = useMemo(
    () => (custom ? buildCustomData(loadGameData(), scenarioId, custom) : loadGameData()),
    [scenarioId, custom],
  );
  const idx = useMemo(() => indexData(data), [data]);

  const [state, setState] = useState<GameState>(() => {
    const s = loadScenario(data, scenarioId, SEED);
    if (humanLordId && s.lords[humanLordId]) s.lords[humanLordId].isHuman = true;
    return s;
  });
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [flashedCities, setFlashedCities] = useState<string[]>([]);
  const [actedOfficers, setActedOfficers] = useState<string[]>([]);
  const [defenseAlert, setDefenseAlert] = useState<GameEvent[] | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((ids: string[]) => {
    setFlashedCities(ids);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    if (ids.length) flashTimer.current = setTimeout(() => setFlashedCities([]), 1400);
  }, []);

  const issue = useCallback(
    (cmd: Command): GameEvent[] => {
      const r = applyCommands(state, idx, [cmd]);
      setState(r.state);
      if (r.events.length) setEvents((e) => [...r.events, ...e].slice(0, 200));
      setActedOfficers((a) => (a.includes(cmd.actorOfficerId) ? a : [...a, cmd.actorOfficerId]));
      return r.events;
    },
    [idx, state],
  );

  const nextMonth = useCallback(() => {
    setState((prev) => {
      if (winner) return prev;
      // 이번 턴의 플레이어(사람) 세력 id
      const humanId = Object.keys(prev.lords).find(
        (l) => prev.lords[l]!.isHuman && prev.lords[l]!.alive,
      );
      const r = runTurn(prev, idx);
      setEvents((e) => [...r.events, ...e].slice(0, 200));
      if (r.winner) setWinner(r.winner);
      // 소유가 바뀐 도시 계산(점령 연출)
      const changed = Object.keys(r.state.cities).filter(
        (id) => r.state.cities[id]!.lordId !== prev.cities[id]!.lordId,
      );
      flash(changed);
      // 내 도시가 함락됐는지(방어 연출)
      if (humanId) {
        const lost = r.events.filter((e) => e.kind === 'conquer' && e.data?.prevOwner === humanId);
        if (lost.length)
          setDefenseAlert(r.events.filter((e) => lost.includes(e) || e.kind === 'lordFall'));
      }
      return r.state;
    });
    setActedOfficers([]); // 새 달 → 행동 초기화
  }, [idx, winner, flash]);

  const save = useCallback(() => {
    const payload: SaveData = { scenarioId, humanLordId, state, events, winner };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  }, [scenarioId, humanLordId, state, events, winner]);

  const load = useCallback(() => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
      const payload = JSON.parse(raw) as SaveData;
      setState(payload.state);
      setEvents(payload.events);
      setWinner(payload.winner);
      setActedOfficers([]);
      flash([]);
      return true;
    } catch {
      return false;
    }
  }, [flash]);

  // 군주가 사망해 후계자로 세력이 승계되면(isHuman 유지) 플레이어도 후계자를 따라간다.
  const activeHumanLordId = humanLordId
    ? (Object.keys(state.lords).find((l) => state.lords[l]!.isHuman && state.lords[l]!.alive) ??
      humanLordId)
    : null;

  return {
    state,
    officer: (id) => idx.officer.get(id),
    city: (id) => idx.city.get(id),
    cities: data.cities,
    events,
    winner,
    humanLordId: activeHumanLordId,
    flashedCities,
    actedOfficers,
    legalFor: (lordId) => listLegalCommands(state, idx, lordId),
    issue,
    nextMonth,
    save,
    load,
    hasSave: typeof localStorage !== 'undefined' && !!localStorage.getItem(SAVE_KEY),
    defenseAlert,
    clearDefenseAlert: () => setDefenseAlert(null),
  };
}

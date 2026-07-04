import { useMemo, useState } from 'react';
import type { Command } from '@sam2/shared';
import { loadGameData } from '@sam2/engine/web';
import { useGame } from './useGame';
import { MapView } from './MapView';
import { factionColor } from './faction';

const SCENARIO_ID = 's1_189';

export function App() {
  const data = useMemo(() => loadGameData(), []);
  const scenario = data.scenarios.find((s) => s.id === SCENARIO_ID)!;
  const [choice, setChoice] = useState<{ lordId: string | null } | null>(null);

  if (!choice) {
    return (
      <StartScreen scenario={scenario} onStart={(lordId) => setChoice({ lordId })} data={data} />
    );
  }
  return <GameScreen humanLordId={choice.lordId} />;
}

function StartScreen({
  scenario,
  onStart,
  data,
}: {
  scenario: ReturnType<typeof loadGameData>['scenarios'][number];
  onStart: (lordId: string | null) => void;
  data: ReturnType<typeof loadGameData>;
}) {
  const name = (id: string) => data.officers.find((o) => o.id === id)?.name ?? id;
  return (
    <div className="start">
      <h1>삼국지 II · 웹</h1>
      <p className="subtitle">
        AI 멀티에이전트 삼국지 · 시나리오 {scenario.year}년 「{scenario.title}」
      </p>
      <h2>군주를 선택하세요</h2>
      <div className="lord-grid">
        {scenario.playableLords.map((lid) => (
          <button
            key={lid}
            className="lord-card"
            style={{ borderColor: factionColor(lid) }}
            onClick={() => onStart(lid)}
          >
            <span className="dot" style={{ background: factionColor(lid) }} />
            {name(lid)}
          </button>
        ))}
      </div>
      <button className="observe" onClick={() => onStart(null)}>
        관전 모드 (모든 세력 AI)
      </button>
      <p className="hint">
        선택한 군주는 직접 명령을 내리고, 나머지 CPU 군주는 AI가 자동으로 판단합니다. (현재 규칙기반
        AI — 이후 Claude 에이전트로 교체 예정)
      </p>
    </div>
  );
}

function GameScreen({ humanLordId }: { humanLordId: string | null }) {
  const g = useGame(SCENARIO_ID, humanLordId);
  const [selected, setSelected] = useState<string | null>(null);

  const sel = selected ? g.state.cities[selected] : null;
  const selCity = selected ? g.city(selected) : null;
  const name = (id: string) => g.officer(id)?.name ?? id;

  const myCities = Object.values(g.state.cities).filter((c) => c.lordId === humanLordId);
  const mySoldiers = myCities.reduce((n, c) => n + c.soldiers, 0);
  const myGold = myCities.reduce((n, c) => n + c.gold, 0);

  // 선택 도시에서 낼 수 있는 플레이어 명령
  const cmds: Command[] =
    selected && humanLordId && sel?.lordId === humanLordId
      ? g.legalFor(humanLordId).filter((c) => c.cityId === selected)
      : [];
  const officerInCity = (cityId: string) =>
    Object.values(g.state.officers).find(
      (o) => o.cityId === cityId && (o.status === 'lord' || o.status === 'officer'),
    );

  return (
    <div className="game">
      <div className="map-pane">
        <MapView
          cities={g.cities}
          state={g.state}
          selectedCityId={selected}
          onSelect={setSelected}
          humanLordId={humanLordId}
        />
      </div>

      <aside className="sidebar">
        <header className="hud">
          <div className="date">
            {g.state.year}년 {g.state.month}월
          </div>
          {humanLordId ? (
            <div className="me">
              <span className="dot" style={{ background: factionColor(humanLordId) }} />
              {name(humanLordId)} · 도시 {myCities.length} · 병 {mySoldiers.toLocaleString()} · 금{' '}
              {myGold.toLocaleString()}
            </div>
          ) : (
            <div className="me">관전 모드</div>
          )}
          <button className="next" onClick={g.nextMonth} disabled={!!g.winner}>
            다음 달 ▶
          </button>
        </header>

        {g.winner && <div className="victory">🏆 천하통일: {name(g.winner)}</div>}

        <section className="panel">
          <h3>{selCity ? `${selCity.name} (${selCity.region})` : '도시를 선택하세요'}</h3>
          {sel && selCity && (
            <>
              <div className="owner">
                <span className="dot" style={{ background: factionColor(sel.lordId) }} />
                {sel.lordId ? name(sel.lordId) : '중립'}
              </div>
              <ul className="stats">
                <li>
                  병사 <b>{sel.soldiers.toLocaleString()}</b>
                </li>
                <li>
                  금 <b>{sel.gold.toLocaleString()}</b>
                </li>
                <li>
                  군량 <b>{sel.rice.toLocaleString()}</b>
                </li>
                <li>
                  토지 <b>{sel.land}</b>
                </li>
                <li>
                  인구 <b>{sel.population.toLocaleString()}</b>
                </li>
                <li>
                  민심 <b>{sel.publicOrder}</b>
                </li>
              </ul>
              {cmds.length > 0 && (
                <div className="commands">
                  <div className="cmd-title">
                    명령 ({name(officerInCity(selected!)?.officerId ?? '')})
                  </div>
                  {dedupeCommands(cmds).map((c, i) => (
                    <button key={i} className="cmd" onClick={() => g.issue(c)}>
                      {commandLabel(c, g.city)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <section className="log">
          <h3>사건 기록</h3>
          <ul>
            {g.events.slice(0, 40).map((e, i) => (
              <li key={i} className={`ev ev-${e.kind}`}>
                {e.message}
              </li>
            ))}
            {g.events.length === 0 && <li className="ev muted">아직 사건이 없습니다.</li>}
          </ul>
        </section>
      </aside>
    </div>
  );
}

/** 같은 종류·대상 명령 중복 제거(장수별 여러 개 나오므로 대표만) */
function dedupeCommands(cmds: Command[]): Command[] {
  const seen = new Set<string>();
  const out: Command[] = [];
  for (const c of cmds) {
    const key = `${c.type}:${c.params.targetCityId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function commandLabel(c: Command, city: (id: string) => { name: string } | undefined) {
  switch (c.type) {
    case 'develop':
      return '🌾 개발 (토지↑)';
    case 'draft':
      return '⚔️ 징병 (병사↑)';
    case 'invade':
      return `🏴 침공 → ${city(String(c.params.targetCityId))?.name ?? c.params.targetCityId}`;
    default:
      return c.type;
  }
}

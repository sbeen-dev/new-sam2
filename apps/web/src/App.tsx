import { useMemo, useState } from 'react';
import type { Command } from '@sam2/shared';
import { loadGameData } from '@sam2/engine/web';
import { useGame } from './useGame';
import { MapView } from './MapView';
import { factionColor } from './faction';

type Data = ReturnType<typeof loadGameData>;

export function App() {
  const data = useMemo(() => loadGameData(), []);
  const [choice, setChoice] = useState<{ scenarioId: string; lordId: string | null } | null>(null);

  if (!choice) {
    return (
      <StartScreen
        data={data}
        onStart={(scenarioId, lordId) => setChoice({ scenarioId, lordId })}
      />
    );
  }
  return (
    <GameScreen
      key={choice.scenarioId + choice.lordId}
      scenarioId={choice.scenarioId}
      humanLordId={choice.lordId}
      onExit={() => setChoice(null)}
    />
  );
}

function StartScreen({
  data,
  onStart,
}: {
  data: Data;
  onStart: (scenarioId: string, lordId: string | null) => void;
}) {
  const [scenarioId, setScenarioId] = useState(data.scenarios[0]!.id);
  const scenario = data.scenarios.find((s) => s.id === scenarioId)!;
  const name = (id: string) => data.officers.find((o) => o.id === id)?.name ?? id;

  return (
    <div className="start">
      <h1>삼국지 II · 웹</h1>
      <p className="subtitle">AI 멀티에이전트 삼국지 · 역사 기반 데이터</p>

      <div className="scenario-tabs">
        {data.scenarios.map((s) => (
          <button
            key={s.id}
            className={`tab ${s.id === scenarioId ? 'active' : ''}`}
            onClick={() => setScenarioId(s.id)}
          >
            {s.year}년 · {s.title}
          </button>
        ))}
      </div>

      <h2>군주를 선택하세요</h2>
      <div className="lord-grid">
        {scenario.playableLords.map((lid) => (
          <button
            key={lid}
            className="lord-card"
            style={{ borderColor: factionColor(lid) }}
            onClick={() => onStart(scenarioId, lid)}
          >
            <span className="dot" style={{ background: factionColor(lid) }} />
            {name(lid)}
          </button>
        ))}
      </div>
      <button className="observe" onClick={() => onStart(scenarioId, null)}>
        관전 모드 (모든 세력 AI)
      </button>
      <p className="hint">
        선택한 군주는 직접 명령을 내리고, 나머지 CPU 군주는 규칙기반 AI가 자동으로 판단합니다.
      </p>
    </div>
  );
}

function GameScreen({
  scenarioId,
  humanLordId,
  onExit,
}: {
  scenarioId: string;
  humanLordId: string | null;
  onExit: () => void;
}) {
  const g = useGame(scenarioId, humanLordId);
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const sel = selected ? g.state.cities[selected] : null;
  const selCity = selected ? g.city(selected) : null;
  const name = (id: string) => g.officer(id)?.name ?? id;

  const myCities = Object.values(g.state.cities).filter((c) => c.lordId === humanLordId);
  const mySoldiers = myCities.reduce((n, c) => n + c.soldiers, 0);
  const myGold = myCities.reduce((n, c) => n + c.gold, 0);

  const cmds: Command[] =
    selected && humanLordId && sel?.lordId === humanLordId
      ? g.legalFor(humanLordId).filter((c) => c.cityId === selected)
      : [];

  return (
    <div className="game">
      <div className="map-pane">
        <MapView
          cities={g.cities}
          state={g.state}
          selectedCityId={selected}
          onSelect={setSelected}
          humanLordId={humanLordId}
          flashedCities={g.flashedCities}
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
          <div className="controls">
            <button
              onClick={() => {
                g.save();
                setSaved(true);
                setTimeout(() => setSaved(false), 1500);
              }}
            >
              {saved ? '저장됨 ✓' : '저장'}
            </button>
            <button onClick={() => g.load()} disabled={!g.hasSave}>
              불러오기
            </button>
            <button onClick={onExit}>새 게임</button>
          </div>
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
                  치수 <b>{sel.flood}</b>
                </li>
                <li>
                  민심 <b>{sel.publicOrder}</b>
                </li>
              </ul>
              {cmds.length > 0 && (
                <div className="commands">
                  <div className="cmd-title">명령</div>
                  {dedupeCommands(cmds).map((c, i) => (
                    <button key={i} className="cmd" onClick={() => g.issue(c)}>
                      {commandLabel(c, name, g.city)}
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
    const key = `${c.type}:${c.params.targetCityId ?? ''}:${c.params.targetOfficerId ?? ''}:${c.params.targetLordId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function commandLabel(
  c: Command,
  name: (id: string) => string,
  city: (id: string) => { name: string } | undefined,
) {
  switch (c.type) {
    case 'develop':
      return '🌾 개발 (토지↑)';
    case 'floodControl':
      return '💧 치수 (수해방지↑)';
    case 'commerce':
      return '🪙 상업 (민심↑)';
    case 'farm':
      return '🌾 농업 (군량↑)';
    case 'draft':
      return '⚔️ 징병 (병사↑)';
    case 'recruit':
      return `🤝 등용 → ${name(String(c.params.targetOfficerId))}`;
    case 'reward':
      return `🎁 포상 → ${name(String(c.params.targetOfficerId))}`;
    case 'move':
      return `➡️ 이동 → ${city(String(c.params.targetCityId))?.name ?? c.params.targetCityId}`;
    case 'rumor':
      return `🗣️ 유언비어 → ${city(String(c.params.targetCityId))?.name ?? c.params.targetCityId}`;
    case 'sow':
      return `🎭 이간 → ${name(String(c.params.targetOfficerId))}`;
    case 'bribe':
      return `💰 매수 → ${name(String(c.params.targetOfficerId))}`;
    case 'ally':
      return `🤝 동맹 → ${name(String(c.params.targetLordId))}`;
    case 'aid':
      return `📦 원조 → ${name(String(c.params.targetLordId))}`;
    case 'recruitCaptive':
      return `⛓️ 포로 등용 → ${name(String(c.params.targetOfficerId))}`;
    case 'releaseCaptive':
      return `🕊️ 포로 해방 → ${name(String(c.params.targetOfficerId))}`;
    case 'executeCaptive':
      return `🗡️ 포로 참수 → ${name(String(c.params.targetOfficerId))}`;
    case 'invade':
      return `🏴 침공 → ${city(String(c.params.targetCityId))?.name ?? c.params.targetCityId}`;
    default:
      return c.type;
  }
}

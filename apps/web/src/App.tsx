import { useMemo, useState } from 'react';
import type { Command, GameEvent } from '@sam2/shared';
import { loadGameData } from '@sam2/engine/web';
import { effWar, effInt, effCha } from '@sam2/engine';
import { useGame } from './useGame';
import { MapView } from './MapView';
import { Avatar } from './Avatar';
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
  const [expandedOfficer, setExpandedOfficer] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [battle, setBattle] = useState<GameEvent[] | null>(null);

  const sel = selected ? g.state.cities[selected] : null;
  const selCity = selected ? g.city(selected) : null;
  const name = (id: string) => g.officer(id)?.name ?? id;
  const acted = new Set(g.actedOfficers);

  const myCities = Object.values(g.state.cities).filter((c) => c.lordId === humanLordId);
  const mySoldiers = myCities.reduce((n, c) => n + c.soldiers, 0);
  const myGold = myCities.reduce((n, c) => n + c.gold, 0);

  const isMyCity = !!(selected && humanLordId && sel?.lordId === humanLordId);
  // 선택 도시에 주재하는 내 장수(+포로) 및 도시 명령
  const officersHere = selected
    ? Object.values(g.state.officers).filter(
        (o) =>
          o.cityId === selected &&
          !o.dead &&
          (o.status === 'officer' || o.status === 'lord' || o.status === 'captive'),
      )
    : [];
  const cityCmds: Command[] = isMyCity
    ? g.legalFor(humanLordId!).filter((c) => c.cityId === selected)
    : [];
  const cmdsForOfficer = (oid: string) =>
    dedupeCommands(cityCmds.filter((c) => c.actorOfficerId === oid));
  const effStat = (oid: string) => {
    const base = g.officer(oid)!;
    return {
      int: effInt(g.state, base.int, oid),
      war: effWar(g.state, base.war, oid),
      cha: effCha(g.state, base.cha, oid),
    };
  };

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
              {officersHere.length > 0 && (
                <div className="officers">
                  <div className="cmd-title">
                    장수 {officersHere.filter((o) => o.status !== 'captive').length}명
                    {isMyCity &&
                      ` · 행동 ${
                        officersHere.filter((o) => o.status !== 'captive' && acted.has(o.officerId))
                          .length
                      }/${officersHere.filter((o) => o.status !== 'captive').length}`}
                  </div>
                  {officersHere.map((o) => {
                    const base = g.officer(o.officerId)!;
                    const st = effStat(o.officerId);
                    const captive = o.status === 'captive';
                    const isActed = acted.has(o.officerId);
                    const cmds = captive ? [] : cmdsForOfficer(o.officerId);
                    const open = expandedOfficer === o.officerId;
                    return (
                      <div key={o.officerId} className={`officer ${isActed ? 'done' : ''}`}>
                        <button
                          className="officer-head"
                          onClick={() => setExpandedOfficer(open ? null : o.officerId)}
                          disabled={!isMyCity || captive || (isActed && cmds.length === 0)}
                        >
                          <Avatar name={base.name} lordId={o.lordId} size={30} dim={isActed} />
                          <span className="oname">
                            {base.name}
                            {o.status === 'lord' && <span className="tag lord">군주</span>}
                            {captive && <span className="tag cap">포로</span>}
                            {isActed && !captive && <span className="tag ok">✓</span>}
                          </span>
                          <span className="ostats">
                            지{st.int} 무{st.war} 매{st.cha}
                          </span>
                        </button>
                        {open && isMyCity && !captive && (
                          <div className="ocommands">
                            {cmds.length === 0 && <div className="none">가능한 명령 없음</div>}
                            {cmds.map((c, i) => (
                              <button
                                key={i}
                                className="cmd"
                                onClick={() => {
                                  const evs = g.issue(c);
                                  setExpandedOfficer(null);
                                  if (c.type === 'invade') setBattle(evs);
                                }}
                              >
                                {commandLabel(c, name, g.city)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {isMyCity && (
                    <div className="hint-inline">
                      장수 1명당 그달 1회 행동. 「다음 달」로 넘기면 초기화됩니다.
                    </div>
                  )}
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

      {battle && <BattleModal events={battle} onClose={() => setBattle(null)} />}
    </div>
  );
}

/** 침공 결과 연출: 일기토 → 승패 → 포로/전리품 */
function BattleModal({ events, onClose }: { events: GameEvent[]; onClose: () => void }) {
  const duel = events.find((e) => e.kind === 'duel');
  const conquer = events.find((e) => e.kind === 'conquer');
  const repelled = events.find((e) => e.kind === 'repelled');
  const captures = events.filter((e) => e.kind === 'capture');
  const item = events.find((e) => e.kind === 'item');
  const won = !!conquer;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`battle-modal ${won ? 'win' : 'lose'}`} onClick={(e) => e.stopPropagation()}>
        <div className="battle-head">{won ? '⚔️ 점령 성공' : '🛡️ 침공 실패'}</div>
        {duel && <div className="battle-duel">🗡️ {duel.message.replace('일기토: ', '')}</div>}
        <div className="battle-body">
          {(conquer ?? repelled)?.message}
          {captures.map((c, i) => (
            <div key={i} className="battle-extra">
              ⛓️ {c.message}
            </div>
          ))}
          {item && <div className="battle-extra gold">🏆 {item.message}</div>}
        </div>
        <button className="battle-close" onClick={onClose}>
          확인
        </button>
      </div>
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

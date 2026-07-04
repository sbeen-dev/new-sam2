import type { GameState, City } from '@sam2/shared';
import { factionColor } from './faction';

const SIZE = 720;
const PAD = 34;
const toPx = (v: number) => PAD + v * (SIZE - 2 * PAD);

/**
 * 절차적 지형 배경. 후한말 중국을 양식화한 SVG(해안선·황하·장강·서부 산악).
 * 외부 지도 타일(네트워크/저작권) 대신 41개 주 좌표에 맞춰 직접 그린다.
 */
function Terrain() {
  const mountains = [
    [196, 300],
    [232, 330],
    [210, 360],
    [250, 375],
    [180, 420],
    [225, 445],
    [270, 460],
    [150, 470],
  ];
  return (
    <g className="terrain" aria-hidden>
      {/* 바다(전체 배경) */}
      <rect x="0" y="0" width={SIZE} height={SIZE} className="sea" />
      {/* 대륙(해안선) */}
      <path
        className="land"
        d="M0 0 L540 0 L560 40 L620 70 Q652 96 610 122 L560 132
           Q520 152 542 176 L560 212 Q602 252 585 302 Q574 342 601 382
           Q626 432 610 482 Q596 542 560 562 Q520 602 540 662 L520 720 L0 720 Z"
      />
      {/* 서부 산악 (익주·한중) */}
      {mountains.map(([x, y], i) => (
        <path key={i} className="mtn" d={`M${x} ${y} l14 -22 l14 22 Z`} />
      ))}
      {/* 황하 */}
      <path
        className="river yellow"
        d="M60 250 Q160 235 250 265 Q340 292 420 255 Q500 224 566 196"
        fill="none"
      />
      {/* 장강 */}
      <path
        className="river yangtze"
        d="M120 470 Q240 455 330 460 Q420 466 500 440 Q572 418 622 436"
        fill="none"
      />
    </g>
  );
}

interface Props {
  cities: City[];
  state: GameState;
  selectedCityId: string | null;
  onSelect: (cityId: string) => void;
  humanLordId: string | null;
  flashedCities: string[];
}

export function MapView({
  cities,
  state,
  selectedCityId,
  onSelect,
  humanLordId,
  flashedCities,
}: Props) {
  const flashSet = new Set(flashedCities);
  const pos = new Map(cities.map((c) => [c.id, { x: toPx(c.x), y: toPx(c.y) }]));

  // 인접선(중복 제거)
  const drawn = new Set<string>();
  const edges: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];
  for (const c of cities) {
    for (const a of c.adjacent) {
      const key = [c.id, a].sort().join('|');
      if (drawn.has(key)) continue;
      drawn.add(key);
      const p1 = pos.get(c.id);
      const p2 = pos.get(a);
      if (p1 && p2) edges.push([p1, p2]);
    }
  }

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="map" role="img" aria-label="전략 지도">
      <Terrain />
      {edges.map(([p1, p2], i) => (
        <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="edge" />
      ))}
      {cities.map((c) => {
        const p = pos.get(c.id)!;
        const cs = state.cities[c.id]!;
        const isMine = humanLordId && cs.lordId === humanLordId;
        const isSel = c.id === selectedCityId;
        const r = 8 + Math.min(9, cs.soldiers / 2500);
        const isFlash = flashSet.has(c.id);
        return (
          <g key={c.id} className="node" onClick={() => onSelect(c.id)}>
            {isFlash && <circle cx={p.x} cy={p.y} r={r} className="flash-ring" fill="none" />}
            <circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill={factionColor(cs.lordId)}
              stroke={isSel ? '#fff' : isMine ? '#ffd54a' : '#1c1c22'}
              strokeWidth={isSel ? 3 : isMine ? 2.5 : 1.2}
            />
            <text x={p.x} y={p.y - r - 4} className="label" textAnchor="middle">
              {c.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

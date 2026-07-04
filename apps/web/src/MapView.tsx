import type { GameState, City } from '@sam2/shared';
import { factionColor } from './faction';

const SIZE = 720;
const PAD = 34;
const toPx = (v: number) => PAD + v * (SIZE - 2 * PAD);

interface Props {
  cities: City[];
  state: GameState;
  selectedCityId: string | null;
  onSelect: (cityId: string) => void;
  humanLordId: string | null;
}

export function MapView({ cities, state, selectedCityId, onSelect, humanLordId }: Props) {
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
      {edges.map(([p1, p2], i) => (
        <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="edge" />
      ))}
      {cities.map((c) => {
        const p = pos.get(c.id)!;
        const cs = state.cities[c.id]!;
        const isMine = humanLordId && cs.lordId === humanLordId;
        const isSel = c.id === selectedCityId;
        const r = 8 + Math.min(9, cs.soldiers / 2500);
        return (
          <g key={c.id} className="node" onClick={() => onSelect(c.id)}>
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

#!/usr/bin/env node
/**
 * regions.json(raw: 노드 + 무방향 간선) → cities.json(marts: 대칭 adjacent).
 * ai-env data-pipeline: raw 보존 + 결정론적 변환(멱등). 같은 입력 → 같은 출력.
 * 실행: node scripts/data/build-cities.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '../../packages/engine/data');

const raw = JSON.parse(readFileSync(join(DATA, '_raw/regions.json'), 'utf8'));
const nodeIds = new Set(raw.nodes.map((n) => n.id));

// 간선을 양방향 인접으로 전개 (대칭 보장)
const adj = new Map(raw.nodes.map((n) => [n.id, new Set()]));
for (const [a, b] of raw.edges) {
  if (!nodeIds.has(a) || !nodeIds.has(b)) throw new Error(`간선에 없는 노드: ${a}-${b}`);
  if (a === b) throw new Error(`자기 간선 금지: ${a}`);
  adj.get(a).add(b);
  adj.get(b).add(a);
}

const cities = raw.nodes.map((n) => ({
  id: n.id,
  name: n.name,
  region: n.region,
  adjacent: [...adj.get(n.id)].sort(),
  x: n.x,
  y: n.y,
}));

const out = {
  _meta: {
    note: '_raw/regions.json에서 자동 생성. 직접 편집 금지 — 원천을 고치고 build-cities.mjs 재실행.',
    generatedFrom: '_raw/regions.json',
    totalCities: cities.length,
    coordScale: '0..1 정규화',
  },
  cities,
};

writeFileSync(join(DATA, 'cities.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`✅ cities.json 생성: ${cities.length}개 주, ${raw.edges.length}개 간선(양방향 전개)`);

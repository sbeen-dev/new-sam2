#!/usr/bin/env node
/**
 * cities.json → SVG 지도(검수용). 41개 주 노드 + 인접선을 그려 좌표·연결이
 * 지리적으로 타당한지 눈으로 확인한다. 게임 렌더가 아니라 데이터 QA 도구.
 * 실행: node scripts/data/render-map.mjs  → docs/data/map-preview.svg
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const { cities } = JSON.parse(readFileSync(join(ROOT, 'packages/engine/data/cities.json'), 'utf8'));

const W = 900;
const H = 900;
const PAD = 40;
const px = (x) => PAD + x * (W - 2 * PAD);
const py = (y) => PAD + y * (H - 2 * PAD);

// 주(州)별 색
const REGION_COLORS = {
  유주: '#6b8cae',
  기주: '#5a9367',
  청주: '#7aa06a',
  병주: '#9c7fb0',
  연주: '#c98a5e',
  사예: '#c0504d',
  예주: '#d0a24c',
  서주: '#4c8fb0',
  양주: '#8a7d5a',
  익주: '#b05f8f',
  형주: '#5aa0a0',
};
const colorOf = (r) => REGION_COLORS[r] ?? '#888';

const pos = new Map(cities.map((c) => [c.id, { x: px(c.x), y: py(c.y) }]));

// 인접선(중복 제거)
const drawn = new Set();
let edges = '';
for (const c of cities) {
  for (const a of c.adjacent) {
    const key = [c.id, a].sort().join('|');
    if (drawn.has(key)) continue;
    drawn.add(key);
    const p1 = pos.get(c.id);
    const p2 = pos.get(a);
    edges += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#bbb" stroke-width="1.5"/>\n`;
  }
}

let nodes = '';
for (const c of cities) {
  const p = pos.get(c.id);
  nodes += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="11" fill="${colorOf(c.region)}" stroke="#333" stroke-width="1.5"/>\n`;
  nodes += `<text x="${p.x.toFixed(1)}" y="${(p.y - 16).toFixed(1)}" font-size="15" font-family="sans-serif" text-anchor="middle" fill="#111">${c.name}</text>\n`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#f7f4ec"/>
<text x="${W / 2}" y="24" font-size="18" font-family="sans-serif" text-anchor="middle" fill="#333">삼국지2 웹 · 41개 주 지도 (데이터 검수용, 서→동 / 북→남)</text>
${edges}${nodes}</svg>\n`;

const out = join(ROOT, 'docs/data/map-preview.svg');
writeFileSync(out, svg);
console.log(`✅ 지도 SVG 생성: ${cities.length}개 주, ${drawn.size}개 간선 → ${out}`);

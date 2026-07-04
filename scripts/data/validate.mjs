#!/usr/bin/env node
/**
 * 게임 데이터 검증 (ai-env project-data-env / data-quality 반영).
 * 검사 항목:
 *   1. 스키마    — 필수 필드 존재·타입
 *   2. 범위      — 능력치 1..100, 좌표 0..1
 *   3. 무결성    — 도시 인접 대칭, 중복 id 없음
 *   4. 참조      — 시나리오의 lord/officer/city id가 실제 존재
 * 실패 시 비영(非0) 종료 → CI 게이트에서 머지 차단.
 * 의존성 없음: `node scripts/data/validate.mjs`
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '../../packages/engine/data');

const errors = [];
const err = (msg) => errors.push(msg);
const load = (f) => JSON.parse(readFileSync(join(DATA, f), 'utf8'));

const STAT_MIN = 1;
const STAT_MAX = 100;

const { officers } = load('officers.json');
const { cities } = load('cities.json');
const { scenarios } = load('scenarios.json');
const { items } = load('items.json');

// --- officers ---
const officerIds = new Set();
for (const o of officers) {
  if (!o.id || typeof o.name !== 'string') err(`officer 필드 누락: ${JSON.stringify(o)}`);
  if (officerIds.has(o.id)) err(`officer 중복 id: ${o.id}`);
  officerIds.add(o.id);
  for (const k of ['int', 'war', 'cha']) {
    if (typeof o[k] !== 'number' || o[k] < STAT_MIN || o[k] > STAT_MAX)
      err(`officer ${o.id} ${k} 범위 밖(${STAT_MIN}..${STAT_MAX}): ${o[k]}`);
  }
  if (o.bornYear > o.diedYear) err(`officer ${o.id} 생몰 역전: ${o.bornYear}>${o.diedYear}`);
}

// --- cities ---
const cityIds = new Set();
for (const c of cities) {
  if (cityIds.has(c.id)) err(`city 중복 id: ${c.id}`);
  cityIds.add(c.id);
  for (const k of ['x', 'y']) {
    if (typeof c[k] !== 'number' || c[k] < 0 || c[k] > 1)
      err(`city ${c.id} ${k} 좌표 범위 밖(0..1): ${c[k]}`);
  }
}
// 인접 대칭 + 존재
for (const c of cities) {
  for (const adj of c.adjacent) {
    if (!cityIds.has(adj)) err(`city ${c.id} 인접에 없는 도시: ${adj}`);
    else {
      const back = cities.find((x) => x.id === adj);
      if (!back.adjacent.includes(c.id)) err(`인접 비대칭: ${c.id}→${adj} 있으나 역방향 없음`);
    }
  }
}

// --- 지도 연결성 (모든 주가 하나로 연결되어야 도달 가능) ---
if (cities.length) {
  const seen = new Set();
  const stack = [cities[0].id];
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    const node = cities.find((c) => c.id === cur);
    for (const a of node.adjacent) if (!seen.has(a)) stack.push(a);
  }
  if (seen.size !== cities.length)
    err(`지도 비연결: 도달 ${seen.size}/${cities.length}개 주(고립 지역 존재)`);
}

// --- scenarios (참조 무결성 + 중복 배치 방지) ---
const scenarioIds = new Set();
for (const s of scenarios) {
  if (scenarioIds.has(s.id)) err(`scenario 중복 id: ${s.id}`);
  scenarioIds.add(s.id);
  for (const lid of s.playableLords)
    if (!officerIds.has(lid)) err(`scenario ${s.id} playableLord 없음: ${lid}`);
  const usedOfficers = new Set();
  const usedCities = new Set();
  for (const lord of s.lords) {
    if (!officerIds.has(lord.lordId)) err(`scenario ${s.id} lordId 없음: ${lord.lordId}`);
    for (const oid of lord.officers) {
      if (!officerIds.has(oid)) err(`scenario ${s.id} officer 없음: ${oid}`);
      if (usedOfficers.has(oid)) err(`scenario ${s.id} officer 중복 배치: ${oid}`);
      usedOfficers.add(oid);
    }
    if (!lord.officers.includes(lord.lordId))
      err(`scenario ${s.id} 군주가 자기 officers에 없음: ${lord.lordId}`);
    for (const ci of lord.cities) {
      if (!cityIds.has(ci.cityId)) err(`scenario ${s.id} city 없음: ${ci.cityId}`);
      if (usedCities.has(ci.cityId)) err(`scenario ${s.id} city 중복 배치: ${ci.cityId}`);
      usedCities.add(ci.cityId);
    }
  }
}

// --- items ---
const itemIds = new Set();
const ITEM_STATS = ['war', 'int', 'cha'];
const ITEM_TYPES = ['sword', 'book', 'treasure'];
for (const it of items) {
  if (itemIds.has(it.id)) err(`item 중복 id: ${it.id}`);
  itemIds.add(it.id);
  if (!ITEM_TYPES.includes(it.type)) err(`item ${it.id} 잘못된 type: ${it.type}`);
  if (!ITEM_STATS.includes(it.stat)) err(`item ${it.id} 잘못된 stat: ${it.stat}`);
  if (typeof it.bonus !== 'number' || it.bonus <= 0) err(`item ${it.id} bonus 이상: ${it.bonus}`);
}

// --- 리포트 ---
console.log(
  `검증 대상: officers=${officers.length}, cities=${cities.length}, scenarios=${scenarios.length}, items=${items.length}`,
);
if (errors.length) {
  console.error(`\n❌ 데이터 검증 실패 (${errors.length}건):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('✅ 데이터 검증 통과');

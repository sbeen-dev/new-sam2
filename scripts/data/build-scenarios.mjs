#!/usr/bin/env node
/**
 * _raw/scenarios.raw.json(compact: 도시를 tier로 표기) → scenarios.json(full 수치).
 * 반복되는 도시 초기 수치를 tier 프리셋으로 압축하고, 필요한 필드만 override.
 * ai-env data-pipeline: raw 보존 + 결정론 변환(멱등). 실행: node scripts/data/build-scenarios.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '../../packages/engine/data');

// 도시 규모 tier 프리셋 (stat-methodology.md 도시 밴드 기반)
const TIERS = {
  capital: {
    gold: 820,
    rice: 1350,
    soldiers: 14000,
    land: 630,
    flood: 540,
    population: 430000,
    publicOrder: 60,
  },
  big: {
    gold: 700,
    rice: 1050,
    soldiers: 11000,
    land: 600,
    flood: 520,
    population: 370000,
    publicOrder: 60,
  },
  mid: {
    gold: 540,
    rice: 820,
    soldiers: 8000,
    land: 540,
    flood: 500,
    population: 300000,
    publicOrder: 60,
  },
  small: {
    gold: 380,
    rice: 600,
    soldiers: 5000,
    land: 470,
    flood: 450,
    population: 190000,
    publicOrder: 58,
  },
  frontier: {
    gold: 300,
    rice: 480,
    soldiers: 4000,
    land: 440,
    flood: 430,
    population: 150000,
    publicOrder: 55,
  },
};
const FIELDS = ['gold', 'rice', 'soldiers', 'land', 'flood', 'population', 'publicOrder'];

const raw = JSON.parse(readFileSync(join(DATA, '_raw/scenarios.raw.json'), 'utf8'));

function expandCity(c) {
  const base = c.tier ? TIERS[c.tier] : {};
  if (c.tier && !base) throw new Error(`알 수 없는 tier: ${c.tier} (${c.cityId})`);
  const out = { cityId: c.cityId };
  for (const f of FIELDS) {
    const v = c[f] ?? base[f];
    if (v === undefined) throw new Error(`${c.cityId}: ${f} 값 없음(tier나 명시 필요)`);
    out[f] = v;
  }
  return out;
}

const scenarios = raw.scenarios.map((s) => ({
  id: s.id,
  year: s.year,
  title: s.title,
  playableLords: s.playableLords,
  lords: s.lords.map((l) => ({
    lordId: l.lordId,
    officers: l.officers,
    cities: l.cities.map(expandCity),
  })),
}));

const out = {
  _meta: {
    note: '_raw/scenarios.raw.json에서 자동 생성. 직접 편집 금지 — 원천을 고치고 build-scenarios.mjs 재실행. 도시 수치는 tier 프리셋(stat-methodology 밴드) + override. 세력 영토는 대표 거점 위주(나머지 중립), 역사 판도 근사.',
    generatedFrom: '_raw/scenarios.raw.json',
    scenarioCount: scenarios.length,
  },
  scenarios,
};

writeFileSync(join(DATA, 'scenarios.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`✅ scenarios.json 생성: ${scenarios.length}개 시나리오`);

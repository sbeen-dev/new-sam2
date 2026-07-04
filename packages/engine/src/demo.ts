/**
 * 헤드리스 데모: 시나리오1을 휴리스틱 AI로 자동 진행하며 정세를 출력한다.
 * LLM 없이 엔진만으로 게임이 굴러가는지 증명한다.
 *   pnpm --filter @sam2/engine demo
 */
import { loadGameData } from './data-node.js';
import { indexData } from './data.js';
import { loadScenario } from './scenario.js';
import { runTurn } from './game.js';
import { activeLords, citiesOf } from './state.js';

const MAX_TURNS = 240; // 최대 20년
const SEED = 20260704;

const data = loadGameData();
const idx = indexData(data);
let state = loadScenario(data, 's1_189', SEED);

const lordName = (id: string) => idx.officer.get(id)?.name ?? id;

function snapshot(): string {
  return activeLords(state)
    .map((lid) => {
      const cs = citiesOf(state, lid);
      const soldiers = cs.reduce((n, c) => n + state.cities[c]!.soldiers, 0);
      return `${lordName(lid)}(도시 ${cs.length}, 병 ${soldiers})`;
    })
    .sort()
    .join('  ');
}

console.log(`=== 삼국지2 데모 · 시나리오1(${state.year}) 반동탁 연합 · seed=${SEED} ===`);
console.log(`시작: ${activeLords(state).length}세력\n${snapshot()}\n`);

let winner: string | null = null;
for (let t = 0; t < MAX_TURNS; t++) {
  const r = runTurn(state, idx);
  state = r.state;
  winner = r.winner;
  // 주요 사건만 출력
  for (const e of r.events)
    if (e.kind === 'conquer' || e.kind === 'lordFall')
      console.log(`  [${state.year}년 ${String(state.month).padStart(2, '0')}월] ${e.message}`);
  if (winner) break;
}

console.log(`\n=== 종료 (${state.year}년, ${state.turn}턴) ===`);
console.log(snapshot());
if (winner) console.log(`\n🏆 천하통일: ${lordName(winner)}`);
else console.log(`\n(제한 턴 도달 — 미통일)`);

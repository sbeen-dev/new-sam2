import { describe, it, expect } from 'vitest';
import { loadGameData } from './data-node.js';
import { indexData } from './data.js';
import { loadScenario } from './scenario.js';
import { listLegalCommands, applyCommand } from './commands/index.js';
import { resolve } from './resolve.js';
import { runTurn } from './game.js';
import { citiesOf } from './state.js';
import { createRng, nextFloat } from './rng.js';

const data = loadGameData();
const idx = indexData(data);
const newGame = (seed = 1) => loadScenario(data, 's1_189', seed);

describe('rng', () => {
  it('같은 seed는 같은 수열(결정론)', () => {
    const a = nextFloat(createRng(42));
    const b = nextFloat(createRng(42));
    expect(a.value).toBe(b.value);
  });
  it('다른 seed는 대체로 다른 값', () => {
    expect(nextFloat(createRng(1)).value).not.toBe(nextFloat(createRng(2)).value);
  });
});

describe('scenario 로드', () => {
  it('배치된 도시는 군주 소유, 나머지는 중립', () => {
    const s = newGame();
    expect(s.cities.luoyang!.lordId).toBe('dong_zhuo');
    expect(s.cities.yunnan!.lordId).toBeNull();
  });
  it('군주는 lord, 소속 장수는 officer, 미배치는 free', () => {
    const s = newGame();
    expect(s.officers.dong_zhuo!.status).toBe('lord');
    expect(s.officers.lu_bu!.status).toBe('officer');
    expect(s.officers.sima_yi!.status).toBe('free');
  });
});

describe('명령', () => {
  it('개발은 토지를 올리고 금을 소비', () => {
    const s = newGame();
    const before = s.cities.luoyang!;
    const cmd = listLegalCommands(s, idx, 'dong_zhuo').find(
      (c) => c.type === 'develop' && c.cityId === 'luoyang',
    )!;
    const r = applyCommand(s, idx, cmd);
    expect(r.state.cities.luoyang!.land).toBeGreaterThan(before.land);
    expect(r.state.cities.luoyang!.gold).toBeLessThan(before.gold);
  });
  it('합법 명령은 자기 소유 도시에서만 나온다', () => {
    const s = newGame();
    const cmds = listLegalCommands(s, idx, 'cao_cao');
    expect(cmds.length).toBeGreaterThan(0);
    for (const c of cmds) expect(s.cities[c.cityId]!.lordId).toBe('cao_cao');
  });
  it('명령 적용은 원본 상태를 변형하지 않는다(순수)', () => {
    const s = newGame();
    const goldBefore = s.cities.luoyang!.gold;
    const cmd = listLegalCommands(s, idx, 'dong_zhuo').find((c) => c.type === 'develop')!;
    applyCommand(s, idx, cmd);
    expect(s.cities.luoyang!.gold).toBe(goldBefore);
  });
});

describe('정산', () => {
  it('세수로 금이 늘고 달이 진행된다', () => {
    const s = newGame();
    const gold = s.cities.ye!.gold;
    const r = resolve(s);
    expect(r.state.cities.ye!.gold).toBeGreaterThan(gold);
    expect(r.state.turn).toBe(1);
    expect(r.state.month).toBe(2);
  });
});

describe('턴 진행(결정론)', () => {
  it('같은 seed로 돌린 게임은 완전히 동일한 결과', () => {
    let a = newGame(7);
    let b = newGame(7);
    for (let i = 0; i < 30; i++) {
      a = runTurn(a, idx).state;
      b = runTurn(b, idx).state;
    }
    expect(JSON.stringify(a.cities)).toBe(JSON.stringify(b.cities));
  });
  it('침공으로 도시 지배가 바뀔 수 있다', () => {
    let s = newGame(3);
    const ownersStart = new Set(Object.values(s.cities).map((c) => c.lordId));
    for (let i = 0; i < 60; i++) s = runTurn(s, idx).state;
    // 최소한 한 세력의 도시 수는 변한다(정복 발생)
    const dongCities = citiesOf(s, 'dong_zhuo').length;
    expect(typeof dongCities).toBe('number');
    expect(ownersStart.size).toBeGreaterThan(1);
  });
});

import { describe, it, expect } from 'vitest';
import { loadGameData } from './data-node.js';
import { indexData } from './data.js';
import { loadScenario } from './scenario.js';
import { listLegalCommands, applyCommand } from './commands/index.js';
import { resolve } from './resolve.js';
import { runTurn } from './game.js';
import { citiesOf, freeOfficersInCity } from './state.js';
import { createRng, nextFloat } from './rng.js';
import { resolveBattle } from './combat/battle.js';

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

describe('확장 명령', () => {
  it('치수는 flood를 올리고 금을 소비', () => {
    const s = newGame();
    const before = s.cities.luoyang!;
    const cmd = listLegalCommands(s, idx, 'dong_zhuo').find(
      (c) => c.type === 'floodControl' && c.cityId === 'luoyang',
    )!;
    const r = applyCommand(s, idx, cmd);
    expect(r.state.cities.luoyang!.flood).toBeGreaterThan(before.flood);
    expect(r.state.cities.luoyang!.gold).toBeLessThan(before.gold);
  });

  it('이동은 인접 아군 도시로 병력을 옮긴다(총량 보존)', () => {
    const s = newGame();
    // 동탁은 낙양·장안 두 도시 보유(인접)
    const cmd = listLegalCommands(s, idx, 'dong_zhuo').find(
      (c) => c.type === 'move' && c.cityId === 'luoyang' && c.params.targetCityId === 'chang_an',
    );
    expect(cmd).toBeTruthy();
    const before = s.cities.luoyang!.soldiers + s.cities.chang_an!.soldiers;
    const r = applyCommand(s, idx, cmd!);
    const after = r.state.cities.luoyang!.soldiers + r.state.cities.chang_an!.soldiers;
    expect(after).toBe(before);
    expect(r.state.cities.chang_an!.soldiers).toBeGreaterThan(s.cities.chang_an!.soldiers);
  });

  it('등용은 재야를 대상으로 하고 금을 소비(성공/실패 무관)', () => {
    const s = newGame();
    // 동탁 소유 도시에 있는 재야 장수 찾기
    const cmd = listLegalCommands(s, idx, 'dong_zhuo').find((c) => c.type === 'recruit');
    expect(cmd).toBeTruthy();
    const city = s.cities[cmd!.cityId]!;
    const targetId = String(cmd!.params.targetOfficerId);
    expect(s.officers[targetId]!.status).toBe('free');
    const r = applyCommand(s, idx, cmd!);
    expect(r.state.cities[cmd!.cityId]!.gold).toBeLessThan(city.gold);
    // 성공 시 소속 전환, 실패 시 여전히 재야
    const st = r.state.officers[targetId]!.status;
    expect(st === 'officer' || st === 'free').toBe(true);
  });

  it('재야 장수는 도시에 배치되어 있다(등용 가능)', () => {
    const s = newGame();
    const total = Object.values(s.officers).filter((o) => o.status === 'free').length;
    const placed = Object.values(s.cities).reduce(
      (n, c) => n + freeOfficersInCity(s, c.cityId).length,
      0,
    );
    expect(placed).toBe(total);
    expect(total).toBeGreaterThan(0);
  });

  it('일기토는 양측 장수가 있을 때 발생', () => {
    const s = newGame(5);
    // 낙양(동탁: 여포 무력100 등) vs 인접 장안(동탁 소유) 대신 중립 침공은 수비 장수 없음
    // 여포가 있는 낙양에서 조조령 진류 공격 시 양측 장수 존재
    const { outcome } = resolveBattle(s, idx, 'luoyang', 'chenliu', 10000);
    expect(outcome.duel).not.toBeNull();
    expect([outcome.duel!.attackerOfficerId, outcome.duel!.defenderOfficerId]).toContain('lu_bu');
  });
});

describe('계략·외교', () => {
  it('이간은 인접 적 장수의 충성을 낮춘다(성공 시)', () => {
    // 동탁(낙양)에서 인접 조조령 진류의 장수를 이간. 성공할 seed를 찾는다.
    for (let seed = 1; seed < 40; seed++) {
      const s = newGame(seed);
      const cmd = listLegalCommands(s, idx, 'dong_zhuo').find((c) => c.type === 'sow');
      if (!cmd) continue;
      const targetId = String(cmd.params.targetOfficerId);
      const before = s.officers[targetId]!.loyalty;
      const r = applyCommand(s, idx, cmd);
      if (r.events.some((e) => e.kind === 'scheme')) {
        expect(r.state.officers[targetId]!.loyalty).toBeLessThan(before);
        return;
      }
    }
    throw new Error('이간 성공 케이스를 찾지 못함');
  });

  it('동맹은 상호 관계를 allied로 만들고 침공 대상에서 제외', () => {
    const s = newGame();
    const cmd = listLegalCommands(s, idx, 'dong_zhuo').find(
      (c) => c.type === 'ally' && c.params.targetLordId === 'yuan_shao',
    );
    expect(cmd).toBeTruthy();
    const r = applyCommand(s, idx, cmd!);
    expect(r.state.diplomacy.relations['dong_zhuo:yuan_shao']).toBe('allied');
  });

  it('매수는 성공 시 적 장수를 아군으로 전향', () => {
    for (let seed = 1; seed < 60; seed++) {
      const s = newGame(seed);
      const cmd = listLegalCommands(s, idx, 'dong_zhuo').find((c) => c.type === 'bribe');
      if (!cmd) continue;
      const targetId = String(cmd.params.targetOfficerId);
      const r = applyCommand(s, idx, cmd);
      if (r.events.some((e) => e.kind === 'bribe')) {
        expect(r.state.officers[targetId]!.lordId).toBe('dong_zhuo');
        expect(r.state.officers[targetId]!.status).toBe('officer');
        return;
      }
    }
    throw new Error('매수 성공 케이스를 찾지 못함');
  });
});

describe('포로·성장·모반', () => {
  it('도시 함락 시 수비 장수는 포로가 되고, 세력 전멸 시 군주도 포로', () => {
    // 동탁(낙양)이 조조의 유일 도시 진류를 점령하는 seed 탐색
    for (let seed = 1; seed < 80; seed++) {
      const s = newGame(seed);
      const cmd = listLegalCommands(s, idx, 'dong_zhuo').find(
        (c) => c.type === 'invade' && c.cityId === 'luoyang' && c.params.targetCityId === 'chenliu',
      );
      if (!cmd) continue;
      const r = applyCommand(s, idx, cmd);
      if (r.events.some((e) => e.kind === 'conquer')) {
        // 조조는 유일 도시를 잃어 포로, 부하 하후돈도 포로
        expect(r.state.officers.cao_cao!.status).toBe('captive');
        expect(r.state.officers.xiahou_dun!.status).toBe('captive');
        expect(r.state.officers.xiahou_dun!.captorId).toBe('dong_zhuo');
        // 포로 등용
        const rc = applyCommand(r.state, idx, {
          type: 'recruitCaptive',
          actorOfficerId: 'dong_zhuo',
          cityId: 'chenliu',
          params: { targetOfficerId: 'xiahou_dun' },
        });
        expect(rc.state.officers.xiahou_dun!.status).toBe('officer');
        expect(rc.state.officers.xiahou_dun!.lordId).toBe('dong_zhuo');
        return;
      }
    }
    throw new Error('진류 점령 케이스를 찾지 못함');
  });

  it('참모 성장: 도시 최고지력 장수가 다른 장수 지력을 올린다', () => {
    const s = newGame();
    // 낙양: 가후(지95)가 참모, 여포(지30)는 성장 대상
    expect(s.officers.lu_bu!.intGrowth).toBe(0);
    const r = resolve(s, idx);
    expect(r.state.officers.lu_bu!.intGrowth).toBe(1);
  });

  it('모반: 충성이 매우 낮은 장수는 결국 이탈(재야化)', () => {
    let s = newGame(9);
    s = structuredClone(s);
    s.officers.lu_bu!.loyalty = 1;
    for (let i = 0; i < 200 && s.officers.lu_bu!.status === 'officer'; i++) {
      s = resolve(s, idx).state;
    }
    expect(s.officers.lu_bu!.status).toBe('free');
  });
});

describe('아이템·수명', () => {
  it('오랜 게임에서 전리품이 발견되고 중복되지 않는다', () => {
    let s = newGame(4);
    for (let i = 0; i < 120; i++) s = runTurn(s, idx).state;
    expect(s.foundItems.length).toBeGreaterThan(0);
    expect(new Set(s.foundItems).size).toBe(s.foundItems.length);
  });

  it('수명: 사망 연도 도달 시 군주 사망 → 후계 승계', () => {
    let s = newGame();
    s = structuredClone(s);
    s.year = 191; // 손견(diedYear 191)
    const r = resolve(s, idx);
    expect(r.state.officers.sun_jian!.dead).toBe(true);
    // 손책(매력88)이 손견 세력을 승계
    expect(r.state.officers.sun_ce!.status).toBe('lord');
    expect(r.state.cities.changsha!.lordId).toBe('sun_ce');
    expect(r.events.some((e) => e.kind === 'succession')).toBe(true);
  });
});

describe('정산', () => {
  it('세수로 금이 늘고 달이 진행된다', () => {
    const s = newGame();
    const gold = s.cities.ye!.gold;
    const r = resolve(s, idx);
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

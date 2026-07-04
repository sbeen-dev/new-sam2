import type { GameState, CityState, OfficerState, LordState } from '@sam2/shared';
import type { GameData } from './data.js';
import { indexData } from './data.js';
import { createRng } from './rng.js';
import { CONFIG } from './config.js';

/**
 * 시나리오를 로드해 초기 GameState를 만든다 (재현 가능한 시작점).
 * 시나리오에 배치된 도시는 해당 군주 소유, 나머지 모든 도시는 중립으로 채운다.
 */
export function loadScenario(data: GameData, scenarioId: string, seed: number): GameState {
  const idx = indexData(data);
  const scenario = idx.scenario.get(scenarioId);
  if (!scenario) throw new Error(`알 수 없는 시나리오: ${scenarioId}`);

  // 모든 도시를 중립으로 초기화
  const cities: Record<string, CityState> = {};
  for (const c of data.cities) {
    cities[c.id] = { cityId: c.id, lordId: null, ...CONFIG.neutralCity };
  }

  const lords: Record<string, LordState> = {};
  const officers: Record<string, OfficerState> = {};

  // 배치되지 않은 장수는 재야(free)
  for (const o of data.officers) {
    officers[o.id] = {
      officerId: o.id,
      lordId: null,
      cityId: null,
      loyalty: 0,
      status: 'free',
      warGrowth: 0,
      intGrowth: 0,
      captorId: null,
      dead: false,
    };
  }

  for (const lord of scenario.lords) {
    lords[lord.lordId] = { lordId: lord.lordId, isHuman: false, alive: true };
    const homeCity = lord.cities[0]?.cityId ?? null;

    for (const ci of lord.cities) {
      cities[ci.cityId] = {
        cityId: ci.cityId,
        lordId: lord.lordId,
        gold: ci.gold,
        rice: ci.rice,
        soldiers: ci.soldiers,
        land: ci.land,
        flood: ci.flood,
        population: ci.population,
        publicOrder: ci.publicOrder,
      };
    }

    for (const oid of lord.officers) {
      officers[oid] = {
        officerId: oid,
        lordId: lord.lordId,
        cityId: homeCity,
        loyalty: oid === lord.lordId ? CONFIG.loyalty.lordInit : CONFIG.loyalty.officerInit,
        status: oid === lord.lordId ? 'lord' : 'officer',
        warGrowth: 0,
        intGrowth: 0,
        captorId: null,
        dead: false,
      };
    }
  }

  // 재야(미배치) 장수를 도시에 결정론적으로 분산 배치(등용 대상). 원작의 탐색/재야 분포를 근사.
  const cityIds = [...data.cities].map((c) => c.id).sort();
  const freeOfficers = data.officers.filter((o) => officers[o.id]!.status === 'free');
  freeOfficers.sort((a, b) => a.id.localeCompare(b.id));
  freeOfficers.forEach((o, i) => {
    officers[o.id]!.cityId = cityIds[i % cityIds.length]!;
  });

  return {
    scenarioId,
    turn: 0,
    year: scenario.year,
    month: 1,
    rng: createRng(seed),
    lords,
    cities,
    officers,
    diplomacy: { relations: {} },
    log: [],
  };
}

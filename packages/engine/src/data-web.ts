import officersJson from '../data/officers.json' with { type: 'json' };
import citiesJson from '../data/cities.json' with { type: 'json' };
import scenariosJson from '../data/scenarios.json' with { type: 'json' };
import type { GameData } from './data.js';
import type { Officer, City, Scenario } from '@sam2/shared';

/**
 * 브라우저(번들러) 환경 데이터 로더. JSON을 정적 import해 번들에 포함한다.
 * Node에서는 '@sam2/engine/node'(fs 기반)를 쓴다.
 */
export function loadGameData(): GameData {
  return {
    officers: officersJson.officers as Officer[],
    cities: citiesJson.cities as City[],
    scenarios: scenariosJson.scenarios as Scenario[],
  };
}

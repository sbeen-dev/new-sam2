import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { GameData } from './data.js';

/**
 * Node 환경 데이터 로더 (fs). 브라우저에서는 번들러가 JSON을 import하도록 별도 로더를 쓴다.
 * 엔진 코어는 GameData를 주입받으므로 로딩 방식에 의존하지 않는다.
 */
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '../data');

const read = (f: string) => JSON.parse(readFileSync(join(DATA_DIR, f), 'utf8'));

export function loadGameData(): GameData {
  return {
    officers: read('officers.json').officers,
    cities: read('cities.json').cities,
    scenarios: read('scenarios.json').scenarios,
  };
}

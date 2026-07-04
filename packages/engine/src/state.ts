import type { GameState } from '@sam2/shared';

/** 한 군주가 소유한 도시 id 목록 */
export function citiesOf(state: GameState, lordId: string): string[] {
  return Object.values(state.cities)
    .filter((c) => c.lordId === lordId)
    .map((c) => c.cityId);
}

/** 한 도시에 주재하는(소속·현지) 장수 id 목록 */
export function officersInCity(state: GameState, cityId: string): string[] {
  return Object.values(state.officers)
    .filter((o) => o.cityId === cityId && (o.status === 'officer' || o.status === 'lord'))
    .map((o) => o.officerId);
}

/** 한 도시에 있는 재야(무소속) 장수 id 목록 (등용 대상) */
export function freeOfficersInCity(state: GameState, cityId: string): string[] {
  return Object.values(state.officers)
    .filter((o) => o.cityId === cityId && o.status === 'free')
    .map((o) => o.officerId);
}

/** 아직 생존해 도시를 하나라도 가진 군주 id 목록 */
export function activeLords(state: GameState): string[] {
  return Object.keys(state.lords).filter(
    (lid) => state.lords[lid]!.alive && citiesOf(state, lid).length > 0,
  );
}

/** 통일 여부: 비중립 도시를 한 군주가 모두 소유하면 그 군주 반환 */
export function checkVictory(state: GameState): string | null {
  const owners = new Set(
    Object.values(state.cities)
      .filter((c) => c.lordId !== null)
      .map((c) => c.lordId),
  );
  return owners.size === 1 ? [...owners][0]! : null;
}

import type { GameState, DiplomacyStatus } from '@sam2/shared';

/** 실효 무력 = 정적 war + 성장치. idx는 정적 데이터 인덱스. */
export function effWar(state: GameState, baseWar: number, officerId: string): number {
  return baseWar + (state.officers[officerId]?.warGrowth ?? 0);
}

/** 실효 지력 = 정적 int + 성장치. */
export function effInt(state: GameState, baseInt: number, officerId: string): number {
  return baseInt + (state.officers[officerId]?.intGrowth ?? 0);
}

/** 두 군주 관계의 정규화 키(정렬 쌍) */
export function relationKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

/** 두 군주의 외교 상태(기본 neutral) */
export function getRelation(state: GameState, a: string, b: string): DiplomacyStatus {
  return state.diplomacy.relations[relationKey(a, b)] ?? 'neutral';
}

/** 한 군주가 소유한 도시 id 목록 */
export function citiesOf(state: GameState, lordId: string): string[] {
  return Object.values(state.cities)
    .filter((c) => c.lordId === lordId)
    .map((c) => c.cityId);
}

/** 한 도시에 주재하는(소속·현지) 장수 id 목록 */
export function officersInCity(state: GameState, cityId: string): string[] {
  return Object.values(state.officers)
    .filter(
      (o) => !o.dead && o.cityId === cityId && (o.status === 'officer' || o.status === 'lord'),
    )
    .map((o) => o.officerId);
}

/** 한 도시에 있는 재야(무소속) 장수 id 목록 (등용 대상) */
export function freeOfficersInCity(state: GameState, cityId: string): string[] {
  return Object.values(state.officers)
    .filter((o) => !o.dead && o.cityId === cityId && o.status === 'free')
    .map((o) => o.officerId);
}

/** 한 도시에 억류된 포로 id 목록 (사로잡은 군주가 처리) */
export function captivesInCity(state: GameState, cityId: string, captorId: string): string[] {
  return Object.values(state.officers)
    .filter(
      (o) => !o.dead && o.cityId === cityId && o.status === 'captive' && o.captorId === captorId,
    )
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

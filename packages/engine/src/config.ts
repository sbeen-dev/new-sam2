/**
 * 밸런싱 파라미터 — 매직넘버를 한 곳에 모아 튜닝 가능하게(coding-standards).
 * 값은 게임성 기준 초기치이며 플레이테스트로 조정한다.
 */
export const CONFIG = {
  /** 중립(무주공산) 도시 기본 수치 */
  neutralCity: {
    gold: 100,
    rice: 200,
    soldiers: 1000,
    land: 400,
    flood: 400,
    population: 100_000,
    publicOrder: 50,
  },
  /** 개발 명령: 비용과 지력당 상승폭 */
  develop: { goldCost: 50, landPerInt: 0.4, landCap: 1000 },
  /** 징병 명령: 비용과 매력당 모집 배수. 인구의 일정 비율 상한 */
  draft: { goldPer1000: 20, soldiersPerCha: 25, maxPopulationRatio: 0.1 },
  /** 월 정산: 세수·수확·군량 소비 */
  economy: {
    taxPerLand: 0.5, // 금 수입 = land * 이 값 (월)
    harvestMonth: 9, // 9월에 수확
    harvestPerLand: 2.0, // 수확 시 rice = land * 이 값
    riceUpkeepPer1000Soldiers: 10, // 병사 유지 군량(월)
  },
  /** 전투 */
  combat: {
    warBonus: 0.006, // 최고 무력 1당 전투력 배수 가산
    rngJitter: 0.15, // ±15% 난수 변동
    attackerMoveRatio: 0.6, // 승리 시 점령지로 이동하는 공격 병력 비율
    minInvadeSoldiers: 2000, // 침공 최소 병력
  },
  loyalty: { lordInit: 100, officerInit: 90 },
} as const;

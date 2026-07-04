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
  /** 치수 명령: 비용과 지력당 상승폭 */
  floodControl: { goldCost: 50, floodPerInt: 0.4, floodCap: 1000 },
  /** 상업/시찰 명령: 매력당 민심 상승 */
  commerce: { goldCost: 40, orderPerCha: 0.15, orderCap: 100 },
  /** 농업 명령: 지력당 군량 확충 */
  farm: { goldCost: 40, ricePerInt: 3 },
  /** 징병 명령: 비용과 매력당 모집 배수. 인구의 일정 비율 상한 */
  draft: { goldPer1000: 20, soldiersPerCha: 25, maxPopulationRatio: 0.1 },
  /** 이동 명령: 병력을 인접 아군 도시로. 최소 잔류 병력 */
  move: { keepMin: 500 },
  /** 등용 명령: 재야 영입. 비용과 매력 기반 성공률 */
  recruit: { goldCost: 100, baseChance: 0.2, chaDivisor: 120 },
  /** 포상 명령: 충성도 상승 */
  reward: { goldCost: 80, loyaltyGain: 10, loyaltyCap: 100 },
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
    duelWinnerBonus: 0.12, // 일기토 승리 진영 전투력 가산
  },
  loyalty: { lordInit: 100, officerInit: 90 },
} as const;

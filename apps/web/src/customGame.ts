import type { Officer, Scenario } from '@sam2/shared';
import type { loadGameData } from '@sam2/engine/web';

type Data = ReturnType<typeof loadGameData>;

export const CUSTOM_LORD_ID = 'custom_lord';

/** 신군주(커스텀 군주) 생성 설정 */
export interface CustomLord {
  name: string;
  int: number;
  war: number;
  cha: number;
  /** 시작 도시(중립이어야 함) */
  cityId: string;
}

/** 능력치 배분 규칙 */
export const CUSTOM_STAT = { min: 40, max: 99, budget: 210 };

/** 신군주가 시작 가능한 중립 거점(시나리오1 기준, 변경 코너) */
export const CUSTOM_START_CITIES = ['xiangping', 'yunnan', 'kuaiji', 'wuwei', 'beihai'];

/**
 * 기존 데이터에 신군주와 그 시작 세력을 주입한 새 데이터를 만든다(원본 불변).
 * 커스텀 군주는 선택한 중립 도시를 지배하며 시나리오에 참전한다.
 */
export function buildCustomData(data: Data, scenarioId: string, cfg: CustomLord): Data {
  const customOfficer: Officer = {
    id: CUSTOM_LORD_ID,
    name: cfg.name || '신군주',
    int: cfg.int,
    war: cfg.war,
    cha: cfg.cha,
    compat: 8,
    bornYear: 160,
    diedYear: 255,
  };

  const scenarios: Scenario[] = data.scenarios.map((s) =>
    s.id !== scenarioId
      ? s
      : {
          ...s,
          playableLords: [...s.playableLords, CUSTOM_LORD_ID],
          lords: [
            ...s.lords,
            {
              lordId: CUSTOM_LORD_ID,
              officers: [CUSTOM_LORD_ID],
              cities: [
                {
                  cityId: cfg.cityId,
                  gold: 400,
                  rice: 700,
                  soldiers: 5000,
                  land: 480,
                  flood: 460,
                  population: 190000,
                  publicOrder: 62,
                },
              ],
            },
          ],
        },
  );

  return { ...data, officers: [...data.officers, customOfficer], scenarios };
}

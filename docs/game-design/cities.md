# 도시(주, 州) 시스템 분석

> 삼국지2 지도는 **41개 주**로 구성(위키·GameFAQs 확인). 각 주는 인접 주와 연결되어
> 침공은 인접 주로만 가능. 정확한 좌표/수치는 재구성(→ `docs/data/data-catalog.md`).

## 도시 파라미터
| 파라미터 | 원문 | 설명 |
|----------|------|------|
| 금 | 金 (Gold) | 자금. 징병·구매·포상·등용에 사용 |
| 군량 | 米 (Rice) | 식량. 전쟁 시 병사 1명당 월 1 소비 |
| 병사 | 兵 (Soldiers) | 주둔 병력(원작 표기는 /100 단위) |
| 토지/개발 | 土地 (Land value) | 개발 명령으로 상승. 세수·수확 기반 |
| 치수 | 治水 (Flood control) | 수해 방지. 낮으면 홍수로 인구·수확 피해 |
| 인구 | 人口 (Population) | 징병 상한·세수의 근간 |
| 민충성(민심) | 民忠 | 주민 충성. 낮으면 폭동·이탈 |
| 무기·마 | 武器·馬 | 부대 장비(전투력 보정) *(이식판별 차이)* |

## 지리·인접
- 주는 **인접 그래프**로 연결. 부대 이동/침공은 인접한 주로만.
- 지형(강·산)이 방어·이동에 영향(원작은 단순화된 인접 모델).

## 데이터 모델 (구현 계약)
```ts
interface City {
  id: string;          // "luoyang"
  name: string;        // 낙양
  adjacent: string[];  // 인접 도시 id
  x: number; y: number; // 지도 좌표(정규화)
}
interface CityState {   // 런타임(세이브)
  cityId: string;
  lordId: string | null;
  gold: number;
  rice: number;
  soldiers: number;
  land: number;        // 0..1000 등급
  flood: number;       // 치수 0..1000
  population: number;
  publicOrder: number; // 민충성 1..100
}
```
정적 지리(`data/cities.json`)와 런타임 상태를 분리. 시나리오가 초기 런타임 값 주입.

## 수집 상태
- ✅ 파라미터 종류·전쟁 군량 소비 규칙: 확정
- ✅ 총 41개 주: 확정
- ⚠️ 41개 주 이름·인접·좌표·초기값: **재구성 필요**. 원작 지도는 실제 후한 13주(州)를
  세분화한 것 → 역사 지명 기반으로 목록화 가능(자유 이용).

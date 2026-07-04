# 시나리오 분석

> 삼국지2는 **6개 시나리오**를 제공하며 각각 시작 연도의 세력 판도를 재현한다.
> 게임 시작 후 전개는 소설을 따르지 않는다. 아래 연도/주제는 구현 기준선이며,
> **각 시나리오의 세력·군주·도시 배치·초기 수치는 재구성 필요**(원작 데이터=KOEI 저작물).

## 시나리오 목록 (기준선)
| # | 연도(AD) | 주제 | 판도 요약 |
|---|----------|------|-----------|
| 1 | 189 | 동탁 집권 / 반동탁 연합 | 군웅할거의 시작. 다수 군소 세력 |
| 2 | 194 | 군웅할거 | 조조·여포·유비·손책 등 부상 |
| 3 | 201 | 관도대전 전후 | 조조 북방 통합기 |
| 4 | 208 | 적벽대전 | 조조 남하 vs 손·유 연합 |
| 5 | 215 | 삼국 정립 직전 | 위·촉·오 골격 형성 |
| 6 | 220 | 삼국 정립 | 위·촉·오 정립기 |

> ⚠️ 연도·주제는 시리즈/이식판 통설 기준. **원작 매뉴얼로 최종 검증** 필요(§ 미해결 항목).

## 시나리오 데이터 모델 (구현 계약)
시나리오는 정적 데이터(장수/도시)에 **초기 런타임 상태를 입히는 스냅샷**이다.
```ts
interface Scenario {
  id: string;             // "s1_189"
  year: number;           // 189
  title: string;          // "반동탁 연합"
  playableLords: string[];// 선택 가능한 군주 officer id
  lords: ScenarioLord[];
}
interface ScenarioLord {
  lordId: string;                 // 군주 officer id
  cities: ScenarioCityInit[];     // 초기 지배 도시와 수치
  officers: string[];             // 초기 소속 장수 id
}
interface ScenarioCityInit {
  cityId: string;
  gold: number; rice: number; soldiers: number;
  land: number; flood: number; population: number; publicOrder: number;
}
```
로더: `loadScenario(id) -> GameState`. 시나리오 = 재현 가능한 시작점.

## 신군주(新君主) — 커스텀 군주
삼국지2 특징. 플레이어가 이름·능력치를 정한 가상 군주로 시작. 데이터 모델은
`Officer`(status='lord')를 사용자 입력으로 생성해 임의 시나리오에 주입.

## 수집 상태
- ✅ 6개 시나리오·연도 골격, 신군주 개념: 확정
- ⚠️ 각 시나리오 세력별 배치·초기 수치: **재구성 필요**(역사 판도 + 밸런싱)

## 미해결(원작 검증 필요) 항목
- 6개 시나리오의 **정확한 시작 연도·명칭**(매뉴얼 대조)
- 시나리오별 등장 세력/군주 목록과 초기 도시 지배 관계
- 신군주 생성 시 배치 규칙

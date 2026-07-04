# 게임 엔진 설계

> `packages/engine` — 삼국지2 규칙의 **결정론적** 구현. LLM/네트워크/랜덤(비주입) 없음.
> 이것이 게임의 "진실의 원천". 에이전트·UI는 모두 이 위에서 동작.

## 책임

- 게임 상태 모델(`GameState`) 정의·전이.
- 합법 명령 산출: `listLegalCommands(state, lordId)`.
- 명령 적용: `apply(command, state) -> { state, events }` (순수 함수).
- 월 정산: `resolve(state) -> { state, events }` (수입·수확·군량·전투·계략·이벤트).
- 시나리오 로드: `loadScenario(id) -> GameState`.
- 승패 판정: `checkVictory(state)`.

## 결정론 & 재현성

- 모든 확률은 주입된 `Rng(seed)`로만. 전역 `Math.random` 금지.
- 같은 (초기상태 + seed + 명령열) → 항상 같은 결과. → 테스트·리플레이·밸런싱의 기반.

## 상태 모델(요약)

```ts
interface GameState {
  turn: number; // 통산 개월
  year: number;
  month: number;
  rng: RngState; // 결정론 난수 상태
  lords: Record<string, LordState>;
  cities: Record<string, CityState>;
  officers: Record<string, OfficerState>;
  diplomacy: DiplomacyState;
  log: GameEvent[];
}
```

정적 데이터(`data/*.json`: officers/cities 기본치)와 가변 상태를 분리.

## 모듈 경계

```
engine/src/
  types.ts        # 상태·명령·이벤트 타입(shared 재수출)
  rng.ts          # 결정론 난수
  state.ts        # 상태 생성·조회 헬퍼
  scenario.ts     # 시나리오 로더
  commands/       # 명령별 순수 함수 (develop, draft, invade, ...)
  combat/         # 일기토·부대전·계략(결정론)
  resolve.ts      # 월 정산
  ai/heuristic.ts # LLM 없는 폴백 AI (규칙기반)
  index.ts        # 공개 API
```

- 각 명령은 한 파일·한 함수. 부수효과 없음(새 상태 반환).
- `ai/heuristic.ts`는 엔진에 두어 **LLM 없이도 완결**되게 한다(멀티에이전트는 그 위 레이어).

## 품질

- 명령·전투 규칙마다 단위 테스트(vitest). 회귀 방지.
- 밸런싱 계수는 `config.ts` 한 곳에 모아 튜닝 가능하게.

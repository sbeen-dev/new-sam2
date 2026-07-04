# AI 멀티에이전트 아키텍처

> 웹 리뉴얼의 핵심 차별점: **각 CPU 군주를 Claude 기반 자율 에이전트**로 구동한다.
> 원작의 고정된 규칙 AI 대신, 성격·전략이 다른 LLM 에이전트들이 매 턴 판단해 매 플레이가 달라진다.

## 설계 원칙: 규칙(결정론) ↔ 판단(LLM) 분리
```
┌─────────────────────────────────────────────────────────┐
│  ai-agents (판단 · LLM)                                    │
│   WarlordAgent × N  ──선택──▶  Command[]                  │
└───────────────▲───────────────────────┬──────────────────┘
                │ 관측(state) + 합법행동   │ 검증된 명령
┌───────────────┴───────────────────────▼──────────────────┐
│  engine (규칙 · 결정론, 순수함수)                          │
│   listLegalCommands(state) / apply(cmd,state) / resolve() │
└───────────────────────────────────────────────────────────┘
```
- 에이전트는 엔진이 준 **합법 명령 목록 안에서만** 고른다 → 규칙 위반·환각 실행 불가.
- 엔진은 LLM을 모른다(결정론·테스트 가능). → CLAUDE.md 의존성 방향.

## 에이전트 구성 (멀티에이전트)
| 에이전트 | 역할 | 모델(권장) |
|----------|------|-----------|
| **WarlordAgent** (군주별 N개) | 자기 세력의 그달 명령 결정(내정/군사/외교/전쟁) | Opus 4.8 |
| **AdvisorAgent** (선택) | 군주에게 조언·계략 제안(참모 역할) | Sonnet/Haiku |
| **NarratorAgent** (선택) | 이벤트·대사·연의체 서술 생성 | Haiku 4.5 |
| **Director/Orchestrator** | 턴 순서·에이전트 호출·예산·타임아웃 관리(코드) | — |

> 시작은 **WarlordAgent만**으로 충분. 나머지는 점진 도입.

## 턴 오케스트레이션
```
for lord in turnOrder(state):
    if lord.isHuman: await humanInput()
    else:
        obs   = engine.observe(state, lord)          # 그 군주가 아는 정보만(안개 포함 가능)
        legal = engine.listLegalCommands(state, lord) # 합법 행동
        plan  = await WarlordAgent(lord).decide(obs, legal, budget)  # LLM
        for cmd in plan.commands:
            assert cmd ∈ legal        # 방어적 검증
            state = engine.apply(cmd, state)
state = engine.resolve(state)         # 전투·수입·이벤트 정산
```

## 에이전트 인터페이스 (도구=엔진 함수)
에이전트에게 노출하는 "행동"은 엔진의 합법 명령이 그대로 tool 스키마가 된다.
LLM tool-use로 명령을 **구조화 출력** → 파싱 없이 검증.
```ts
interface WarlordAgent {
  decide(input: {
    observation: Observation;   // 관측된 상태
    legalCommands: Command[];   // 이번 달 가능한 명령(도구 목록)
    persona: Persona;           // 성격/전략 성향(공격적·보수적 등)
    budget: { maxTokens: number; timeoutMs: number };
  }): Promise<{ commands: Command[]; rationale?: string }>;
}
```

## 성격(Persona) 시스템
군주별 `Persona`로 다양성 부여: 공격성·확장성·위험선호·외교성향·삼국지 캐릭터성(예: 조조=현실주의 팽창, 유비=명분·인재중시). 프롬프트에 주입.

## 비용·안전 가드레일 (SEC/EFF)
- **키 보호:** LLM 호출은 서버 경유. `ANTHROPIC_API_KEY`를 브라우저에 노출 금지.
- **예산:** 에이전트별 max_tokens·타임아웃. 실패/초과 시 **규칙기반 폴백**(안전한 기본 명령).
- **작업 난이도별 모델(EFF-07):** 핵심 전략=Opus, 서술/경량 판단=Haiku.
- **결정론 폴백:** LLM 불가(오프라인/키 없음) 시 엔진 내장 휴리스틱 AI로 플레이 가능.
- **검증:** 에이전트 출력은 신뢰하지 않는 외부 입력 — 스키마·합법성 재검증 후 적용.

## 재현성
- 게임 엔진은 seed 결정론. 에이전트 결정 로그(입력·출력·모델)를 세이브에 남겨
  리플레이·디버깅 가능(ai-env 로그 규칙 준용, 민감정보 없음).

## 단계적 도입 로드맵
1. **M0:** 엔진 휴리스틱 AI로 완전한 게임 루프(LLM 없이 플레이 가능).
2. **M1:** WarlordAgent(단일 모델) 연결 — 서버 프록시 + 폴백.
3. **M2:** Persona 다양화 + AdvisorAgent.
4. **M3:** NarratorAgent(연의체 서술)·리플레이·튜닝.

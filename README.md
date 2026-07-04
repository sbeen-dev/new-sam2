# new-sam2 — 삼국지2 웹 리뉴얼 (AI 멀티에이전트)

KOEI 삼국지2(Romance of the Three Kingdoms II) 도스 게임을 웹 버전으로 리뉴얼하는 프로젝트.
**각 CPU 군주를 Claude 기반 자율 에이전트**로 구동하는 AI 멀티에이전트 전략 시뮬레이션.

## 현재 상태: Phase 0 — 기반 & 원작 분석 완료
게임을 만들기 전, 원작 시스템 분석 · 데이터/에셋 수집 계획 · 아키텍처 · 데이터 스키마를
먼저 갖췄다. 상세 진행은 [`docs/roadmap.md`](./docs/roadmap.md).

## 문서 지도
| 영역 | 문서 |
|------|------|
| 원작 시스템 분석 | [`docs/game-design/`](./docs/game-design/) — 개요·장수·도시·명령·전투·시나리오 |
| 데이터 수집·저작권 | [`docs/data/data-catalog.md`](./docs/data/data-catalog.md), [`asset-strategy.md`](./docs/data/asset-strategy.md) |
| 아키텍처 | [`docs/architecture/`](./docs/architecture/) — 멀티에이전트·엔진 |
| 프로젝트 규칙 | [`CLAUDE.md`](./CLAUDE.md) (ai-env 공통 지침 반영) |
| 로드맵 | [`docs/roadmap.md`](./docs/roadmap.md) |

## 구조 (TypeScript 모노레포)
```
packages/shared     공유 도메인 타입 (엔진↔에이전트↔UI 계약)
packages/engine     결정론적 게임 규칙 엔진 (+ data/ 게임 데이터)
packages/ai-agents  AI 멀티에이전트 레이어 (Claude)
apps/web            React + Vite 프론트엔드
scripts/data        데이터 검증·변환 파이프라인
```
설계 핵심: **규칙(엔진=결정론) ↔ 판단(에이전트=LLM) 분리.** 에이전트는 엔진이 허용한
합법 명령만 고른다.

## 요구 사항
- Node ≥ 22, pnpm 10

## 시작
```bash
pnpm install          # 의존성(재현 가능)
pnpm data:validate    # 게임 데이터 무결성 검증
pnpm check            # 품질 게이트(format·lint·typecheck·data·test)
pnpm dev              # 웹 개발 서버 (Phase 4)
```

## 저작권 주의
원작의 **정확한 수치 데이터셋·초상화·음악은 KOEI 저작물**이라 사용하지 않는다.
실제 삼국지 인물·지명·역사와 게임 메커니즘만 자유롭게 재현하고, 데이터는 역사 기반으로
재구성한다. 상세: [`docs/data/data-catalog.md`](./docs/data/data-catalog.md).

## 자료 출처
- [삼국지 II — 위키백과](https://ko.wikipedia.org/wiki/삼국지_II) · [Wikipedia](https://en.wikipedia.org/wiki/Romance_of_the_Three_Kingdoms_II)
- [삼국지 2 — 나무위키](https://namu.wiki/w/삼국지%202) · [Strategy Guide (GameFAQs)](https://gamefaqs.gamespot.com/snes/588628-romance-of-the-three-kingdoms-ii/faqs/2830)

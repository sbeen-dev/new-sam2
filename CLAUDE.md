# CLAUDE.md — new-sam2 (삼국지2 웹 리뉴얼)

KOEI 삼국지2(Romance of the Three Kingdoms II)를 웹 버전으로 리뉴얼하는 프로젝트.
**AI 멀티에이전트**(각 CPU 군주 = Claude 기반 자율 에이전트)를 핵심으로 한다.

> 이 문서는 `sbeen-dev/ai-env`의 공통 지침을 이 프로젝트에 맞게 구체화한 것이다.
> 원문: `ai-env/user-env/ai-guideline.md`, `ai-env/project-dev-env/*`.

## 아키텍처 한눈에

```
packages/shared     공유 도메인 타입 (엔진↔에이전트↔UI 공통 계약)
packages/engine     결정론적 게임 규칙 엔진 (LLM 없음, 순수 함수)
packages/ai-agents  AI 멀티에이전트 레이어 (Claude, 군주별 의사결정)
apps/web            React + Vite 프론트엔드
```

**핵심 원칙 — 규칙과 판단의 분리**

- `engine`은 **결정론**이다. 같은 입력 → 같은 출력. LLM/랜덤/네트워크 없음(랜덤은 seed 주입).
- `ai-agents`는 **판단**이다. 엔진이 제공하는 "가능한 행동"만 고른다. 규칙을 어길 수 없다.
- 의존성 방향: `web → ai-agents → engine → shared`. 안쪽은 바깥을 모른다.

## 개발 규칙 (ai-env 반영)

### 보안 (SEC — 최우선)

- **시크릿 커밋 금지.** `ANTHROPIC_API_KEY`는 `.env`(gitignore)에만. 저장소엔 `.env.example` 키 이름만.
- **API 키를 브라우저에 노출하지 않는다.** 에이전트 LLM 호출은 서버(또는 서버리스 함수) 경유. 프론트에 키를 담지 않는다.
- 외부 입력(에이전트 LLM 출력 포함)은 신뢰하지 않는다. 엔진에 넣기 전 스키마 검증.

### 코드 표준 (`ai-env/project-dev-env/coding-standards.md`)

- 이름은 의도를 드러낸다. 함수는 한 가지 일만. 부수효과와 순수 로직 분리.
- 매직 넘버는 이름 있는 상수로. 주석은 why를 남긴다.
- 포맷은 prettier, 정적분석은 eslint가 강제 — 수동 정렬 금지.

### 품질 게이트 (`ai-env/project-dev-env/quality-gates.md`)

커밋/PR 전 `pnpm check`(format:check + lint + typecheck + test)가 통과해야 한다.
신규/변경 코드는 테스트를 동반한다. 특히 엔진 규칙은 회귀 테스트 필수.

### 워크플로 (`ai-env/project-dev-env/workflow.md`)

- 기본 브랜치에서 직접 작업하지 않는다. `<type>/<설명>` 기능 브랜치.
- 커밋 메시지: Conventional Commits (`feat:`, `fix:`, `docs:` …), 요약은 명령형·50자 이내.
- 공개 API·데이터 스키마·아키텍처 변경은 리뷰 필수.

### 의존성 (`ai-env/project-dev-env/dependency-management.md`)

- 필요할 때만 추가. lockfile(`pnpm-lock.yaml`) 커밋. 한 명령(`pnpm install`)으로 재현.

## 게임 자료

`docs/game-design/`에 삼국지2 원작 시스템(능력치·도시·명령·전투·시나리오) 정리.
게임 데이터(장수/도시/시나리오)는 `packages/engine/data/*.json`.

## 자주 쓰는 명령

```bash
pnpm install        # 의존성 설치 (재현 가능)
pnpm dev            # 웹 개발 서버
pnpm check          # 품질 게이트 전체
pnpm --filter @sam2/engine test   # 엔진 테스트만
```

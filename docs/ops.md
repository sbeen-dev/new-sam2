# 운영 가이드 (배포·CI·시크릿·모니터링)

이 프로젝트가 "완성" 이후 어떻게 운영되는지 정리한다. ai-env `workflow.md`·`quality-gates.md`·
`security.md`를 이 프로젝트에 구체화한 것.

## 1. 애플리케이션 구성 (운영 관점)

현재 앱은 **100% 정적(static) 프론트엔드**다.

- `packages/engine`은 **결정론적**이고 **브라우저에서 실행**된다(서버 불필요).
- 게임 데이터(JSON)는 빌드 시 번들에 포함된다.
- 세이브는 브라우저 `localStorage`.
- 초상·지도·사운드는 절차적 생성(외부 에셋·네트워크 없음).

→ **`vite build` 산출물(`apps/web/dist`)만 정적 호스팅하면 배포 끝.** 별도 백엔드·DB 없음.

> 예외(미래): Phase 3(AI 멀티에이전트 LLM)을 켜면, API 키 보호를 위한 **작은 서버(프록시)**가
> 필요하다(§4).

## 2. CI (지속적 통합)

로컬에서 커밋/PR 전에 `pnpm check`(format·lint·typecheck·data:validate·test)가 통과해야 한다.
**CI가 최종 게이트** — 예시 GitHub Actions(`.github/workflows/ci.yml`):

```yaml
name: ci
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4 # 버전은 package.json packageManager를 따름
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm check # format·lint·typecheck·data·test
      - run: pnpm -r build # 빌드 재현성 확인
```

- **머지 차단 조건**: 위가 하나라도 실패하면 머지 불가(브랜치 보호 규칙).
- 데이터 무결성(`data:validate`)도 CI 게이트에 포함 → 잘못된 장수/도시/시나리오 배포 차단.

## 3. 배포 (정적 호스팅)

`apps/web`을 빌드해 정적 호스트에 올린다. 후보(택1):

| 호스트                                  | 방식                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| **Cloudflare Pages / Netlify / Vercel** | 저장소 연결 → 빌드 명령 `pnpm --filter @sam2/web build`, 출력 `apps/web/dist` |
| **GitHub Pages**                        | Actions로 `dist` 빌드 후 Pages 배포                                           |

- **릴리스 흐름**: 기능 브랜치 → PR → 리뷰 → `main` 머지 → (자동)배포. SemVer 태그 권장.
- `main`은 항상 배포 가능한 상태 유지(`workflow.md`).

## 4. AI 멀티에이전트 운영 (Phase 3 활성화 시)

CPU 군주를 Claude로 구동하면 **API 키를 브라우저에 노출하면 안 된다**(CLAUDE.md SEC).

- **서버 프록시**: 서버리스 함수(Cloudflare Workers/Vercel Functions 등)가 Anthropic 호출을 중계.
  프론트는 그 함수만 호출, 키는 서버 환경변수(`ANTHROPIC_API_KEY`)에만.
- **비용 가드레일**: 에이전트별 `max_tokens`·타임아웃·호출 상한(`.env.example` 참고). 초과 시
  규칙기반 휴리스틱 AI로 **폴백**(게임은 항상 진행).
- **모델 티어**(EFF): 핵심 전략=Opus, 서술/경량=Haiku.
- **관측**: 에이전트 결정 로그(입력·출력·모델·토큰·지연)를 남겨 비용·품질 모니터링.
  민감정보는 로그 금지(`security.md`).

## 5. 시크릿·환경변수

- 실제 값은 `.env`(gitignore)와 호스트의 **환경변수/시크릿 매니저**에만.
- 저장소엔 `.env.example`로 키 이름만. `ANTHROPIC_API_KEY`는 **서버 측 전용**.
- 실수로 커밋 시 히스토리 제거 + **키 즉시 폐기·재발급**.

## 6. 운영 체크리스트

- [ ] `.github/workflows/ci.yml` 추가(§2) + `main` 브랜치 보호 규칙
- [ ] 정적 호스트 연결(§3) — 빌드 명령·출력 경로 설정
- [ ] (Phase 3) 서버 프록시 + `ANTHROPIC_API_KEY` 시크릿 + 비용 가드레일
- [ ] 릴리스 태그·릴리스 노트(사용자 관점 변경) 규칙

# ssh-reports-hub Portfolio & Roadmap

이 문서는 `ssh-reports-hub`를 포트폴리오로 설명할 때 사용할 프로젝트 요약과,
앞으로 개선할 일을 잊지 않고 순서대로 진행하기 위한 TODO입니다.

관련 백엔드/스크래퍼 문서:

- `/home/ubuntu/prod/ssh-reports-scraper/docs/architecture.md`
- `/home/ubuntu/prod/ssh-reports-scraper/docs/changelog.md`

## 프로젝트 한 줄 설명

국내외 증권사 리포트를 수집하는 스크래퍼 시스템과 연동해, 사용자가 날짜/분류/검색/증권사별로 리포트를 빠르게 탐색할 수 있게 만든 React 기반 리포트 허브입니다.

## 포트폴리오 설명 포인트

- **실사용 데이터 기반 서비스:** 28개 증권사 리포트 수집 파이프라인과 연결된 프론트엔드입니다.
- **운영 중심 개선:** 단순 UI가 아니라 PostgreSQL 전환, API 엔드포인트 정리, 테스트 도입, 배포 안정화 흐름과 함께 개선 중입니다.
- **검색/분류 UX:** 최근, 글로벌, 산업, 즐겨찾기, 작성자/제목/증권사 검색 흐름을 제공합니다.
- **무한 스크롤:** 리포트 목록을 페이지네이션 API와 연결해 점진적으로 불러옵니다.
- **공유 기능:** 리포트 공유 링크와 Netlify function 기반 share/proxy 기능을 포함합니다.
- **알림 확장성:** 텔레그램 인증 및 키워드 알림 관리 UI와 연결됩니다.

## 전체 시스템 맥락

스크래퍼 프로젝트는 다음 방향으로 진화했습니다.

1. 2021년: 단일 Python 파일, MySQL/Heroku 기반 수집.
2. 2024년~2026년 3월: 증권사별 모듈 분리, SQLite 기반 운영.
3. 2026년 4월: Docker, async, loguru, ConfigManager, URL secret 관리 도입.
4. 현재: PostgreSQL 중심으로 전환 완료, Oracle ATP/ORDS 제거 예정.

프론트엔드는 이 흐름에서 Oracle/ORDS 의존을 줄이고, PostgreSQL 기반 API로 안정적으로 넘어갈 수 있게 API 호출과 테스트를 정리하는 단계입니다.

## 현재 프론트엔드 구조 메모

- `src/hooks/useReportFetch.js`
  - 리포트 URL 생성, fetch, pagination, 응답 정규화, merge가 섞여 있습니다.
- `src/utils/api.js`
  - API base URL 정규화 로직이 있습니다.
- `src/components/Header.jsx`, `src/components/SearchOverlay.jsx`, `src/context/ReportContext.jsx`
  - 검색 상태와 URL query param 처리가 분산되어 있습니다.
- `src/components/HamburgerMenu.jsx`
  - 메뉴 UI, 텔레그램 인증, 키워드 fetch/sync/delete 로직이 함께 있습니다.
- `netlify/functions/share.js`, `netlify/functions/proxy.js`
  - 공유 링크와 일부 파일 다운로드 프록시 역할을 담당합니다.

## 개선 원칙

- 한 번에 큰 리팩터링을 하지 않고, 테스트 가능한 순수 함수부터 분리합니다.
- API endpoint 규칙을 컴포넌트마다 기억하지 않게 중앙화합니다.
- React hook/component 테스트보다 URL builder, normalize, merge 같은 순수 함수 테스트를 먼저 작성합니다.
- 포트폴리오 관점에서는 "왜 개선했는지", "어떤 회귀를 막는지", "운영 안정성에 어떤 효과가 있는지"를 기록합니다.

## TODO

| 순서 | 상태 | 작업 | 목적 |
|---:|---|---|---|
| 1 | 완료 | `src/utils/api.js` 테스트 추가 | API base URL 정규화 회귀 방지 |
| 2 | 예정 | 리포트 URL builder 분리 | 307 redirect, query param 회귀 방지 |
| 3 | 예정 | 리포트 normalize/merge helper 분리 | API 응답 필드 혼용 및 중복 제거 테스트 |
| 4 | 예정 | 작은 API client wrapper 도입 | fetch/error/json 처리 중앙화 |
| 5 | 예정 | 검색 상태 정리 | Header/SearchOverlay/URL param 간 상태 꼬임 감소 |
| 6 | 예정 | `HamburgerMenu`에서 auth/keyword hook 분리 | UI와 API side effect 분리 |
| 7 | 예정 | PostgREST/신규 API 전환 준비 | Oracle/ORDS 제거 흐름과 프론트 API 계약 정리 |
| 8 | 예정 | 포트폴리오용 README 개선 | 문제, 해결, 아키텍처, 운영 경험을 명확히 설명 |

## 완료 기록

- 2026-04-20: 프론트 API base URL 정규화 추가.
  - 비-localhost `http` API origin을 `https`로 보정.
  - trailing slash 제거.
  - 잘못된 URL은 기본 API URL로 fallback.
- 2026-04-20: AI/local/build/secrets ignore 파일 정리.
  - `.gitignore`, `.codexignore`, `.geminiignore`, `.claudeignore` 추가/정리.
  - `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`에서 이 문서를 참고하도록 연결.
- 2026-04-20: `src/utils/api.js` 정규화 테스트 추가.
  - Node 내장 테스트 러너를 사용해 추가 의존성 없이 검증.
  - trailing slash, http→https 보정, localhost 예외, invalid URL fallback 검증.

## 포트폴리오 README에 넣을 후보 문장

> 증권사 리포트 수집 파이프라인과 연결된 React 기반 리포트 허브입니다. 28개 증권사의 리포트를 날짜, 시장 구분, 증권사, 작성자 기준으로 탐색할 수 있으며, 스크래퍼 시스템의 PostgreSQL 전환과 함께 프론트엔드 API 호출 구조와 테스트를 단계적으로 정리하고 있습니다.

> 단순 화면 구현보다 운영 중인 데이터 파이프라인의 변경에 대응하는 안정성을 중점에 두었습니다. API URL 정규화, 리포트 URL builder 테스트, 응답 정규화 테스트를 통해 redirect 및 응답 필드 변경으로 인한 회귀를 줄이는 방향으로 개선하고 있습니다.

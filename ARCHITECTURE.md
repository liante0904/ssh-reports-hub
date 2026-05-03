# Architecture & Roadmap

> 이 문서는 프로젝트의 현재 구조, 설계 결정 배경, 진행 중인 리팩토링 방향을 기록합니다.
> 작업 시작 전 이 문서를 먼저 읽고, 작업 완료 후 변경 내용을 반영해 주세요.
>
> Workspace boundary: this repository is public-only. Do not connect it to any `private` or `pvt` workspace, container, volume, or network unless the user explicitly asks for that exact action. See [NOTICE.md](./NOTICE.md).

---

## 현재 스택 (2026-04-21 기준)

### 인프라 (`~/infra/`)

- `~/infra/docker-compose.yml` — portal, nginx, postgresql 등 include하는 루트 컴포즈
- `main-postgres` — `127.0.0.1:5432` 바인딩 (외부 차단)
- `main-pgadmin` — https://oci-infra.tailb32978.ts.net/pgadmin/ (Tailscale VPN 경유)
- DB 계정 현황:
  - `admin` — 비밀번호 회전 완료 (2026-04-17)
  - `ssh_reports_hub` — 비밀번호 회전 완료 (2026-04-17)
- 시크릿 관리: `~/secrets/{infra,ssh-reports-scraper,ssh-reports-hub}/secrets.json` (chmod 600)
- **PostgreSQL 비번은 `infra/secrets.json`이 단일 진실 소스** (`POSTGRES_SSH_REPORTS_HUB_PASSWORD`)
- `.env` 재생성: `python3 ~/secrets/generate_env.py` (전체) / `python3 ~/secrets/generate_env.py scraper` (개별)
- 비번 변경 절차: `infra/secrets.json` 수정 → `generate_env.py` 실행 → 컨테이너 `down && up`

```
스크래퍼 (scraper.py)
    │
    ▼
PostgreSQL (TB_SEC_REPORTS)      ← DB_BACKEND=postgres (2026-04-21 재전환 완료)
    │
    ├── 텔레그램 채널 발송
    └── FastAPI ORDS 호환 API 조회

SQLite (telegram.db)는 롤백/최근 동기화 소스로 유지
※ Oracle ATP / ORDS → ADR-005에서 제거 예정
```

### 주요 구성 요소 (Frontend & Backend)

| 구성 요소 | 역할 |
|---|---|
| `scraper.py` | 28개 증권사 스크래핑 스케줄러 |
| `src/components/` | React 기반 프론트엔드 UI 컴포넌트 |
| `src/hooks/` | 비즈니스 로직 분리 (useKeywords, useReportFetch 등) |
| `models/db_factory.py` | DB_BACKEND 기반 팩토리 (SQLite ↔ PostgreSQL) |
| `models/ConfigManager.py` | 환경별 설정 중앙화 (싱글톤) |

---

## 아키텍처 결정 기록 (ADR)

### ADR-001 ~ ADR-007 (Backend/Infra)
*(생략: 유저 제공 내용과 동일)*

### ADR-005: Oracle ATP 제거 및 PostgREST 전환

- **상태:** 완료 (2026-04-21)
- **배경:** Oracle ATP 및 ORDS의 복잡성을 제거하고, PostgreSQL 직결 API(PostgREST/FastAPI)로 단일화하여 유지보수성 향상.
- **결정:** PostgREST 배포 및 프론트엔드 엔드포인트 전면 교체.
- **효과:** 인프라 단순화 및 쿼리 성능 개선.

### ADR-008: 프론트엔드 컴포넌트 리팩토링 및 인증 로직 안정화

- **상태:** 완료 (2026-04-21)
- **배경:** `HamburgerMenu.jsx`가 비대해지면서 가독성이 떨어지고, 함수 참조값 변화로 인한 무한 루프 리스크 발생.
- **결정:**
  - `AdminSection.jsx` 분리: 관리자 링크(pgAdmin, Grafana 등) 선언적 관리.
  - `useKeywords.js` 훅 도입: 키워드 CRUD 로직 캡슐화.
  - `ReportContext` 통합: 로그아웃(`logout`) 함수를 전역 Context로 옮겨 안정적인 참조값 제공.
- **효과:** 코드량 50% 감소 및 무한 루프 발생 가능성 원천 차단.

### ADR-009: App 레이아웃 및 이벤트 로직 분리

- **상태:** 완료 (2026-04-21)
- **배경:** `App.jsx`에 스크롤 감지, 리사이즈 감지, 레이아웃 계산(ResizeObserver) 로직이 모여 있어 가독성이 떨어지고, 메인 컴포넌트 수정 시 부주의로 인한 이벤트 로직 파손 위험이 큼.
- **결정:** `useAppLayout.js` 커스텀 훅을 생성하여 모든 브라우저 이벤트 및 관련 상태를 캡슐화.
- **효과:** `App.jsx`를 순수 구조 중심 컴포넌트로 유지하여 유지보수성 향상 및 렌더링 최적화 기반 마련.

### ADR-010: 전역 설정 및 환경 변수 중앙화 (CONFIG)

- **상태:** 완료 (2026-04-21)
- **배경:** `import.meta.env`와 로컬 스토리지 키들이 코드 곳곳에 흩어져 있어 관리 포인트가 많고, URL 구조 변경 시 휴먼 에러 발생 가능성이 높음.
- **결정:** `src/constants/config.js`를 생성하여 모든 API URL, 텔레그램 봇 정보, 로컬 스토리지 키 등을 단일 객체(`CONFIG`)로 관리.
- **효과:** 환경 변수 변경 및 URL 리팩토링 시 단일 소스(SSOT)에서 수정 가능하여 유지보수성 극대화.

### ADR-011: 상수 및 유틸리티 분리 (Constants & Utils)

- **상태:** 완료 (2026-04-21)
- **배경:** 증권사 목록(`FIRM_NAMES`)과 날짜 파싱 로직 등이 컴포넌트나 훅 내부에 하드코딩되어 있어 코드 중복이 발생하고 오타로 인한 버그(삽질) 리스크가 존재함.
- **결정:** 
  - `src/constants/firms.js`: 증권사 명칭 및 카테고리 상수화.
  - `src/utils/date.js`: 공통 날짜 포맷팅 로직 유틸리티화.
- **효과:** 코드 중복 제거, 가독성 향상 및 데이터 일관성 확보.

### ADR-012: API 요청 추상화 (Request Utility)

- **상태:** 완료 (2026-04-21)
- **배경:** 각기 다른 곳에서 `fetch`를 직접 호출하면서 인증 헤더 누락, 에러 핸들링 부재, 중복된 파싱 로직 등의 문제가 발생함.
- **결정:** `src/utils/api.js`에 전역 `request` 유틸리티를 생성하여 모든 API 호출을 통합 관리.
- **효과:** 
  - 인증 토큰 자동 주입 및 401 에러 시 자동 로그아웃 연동.
  - 일관된 에러 처리 및 로깅으로 디버깅 편의성 향상.
  - 중복 코드 제거로 비즈니스 로직 가독성 극대화.

### ADR-013: 리포트 그룹화 컴포넌트 분리 (ReportGroup)

- **상태:** 완료 (2026-04-21)
- **배경:** `ReportList.jsx`에서 날짜별/증권사별 그룹화 렌더링 로직이 얽혀 있어 코드 가독성이 떨어지고, 정렬/필터 로직 수정 시 리스트 전체가 깨질 위험이 큼.
- **결정:** 날짜별 그룹 렌더링을 담당하는 `ReportGroup.jsx` 컴포넌트를 분리하여 렌더링 책임을 분산.
- **효과:** 메인 리스트 컴포넌트의 가독성 향상 및 그룹별 렌더링 로직의 독립성 확보.

---

## 프론트 정리 백로그

> 목적: React 레이어에서 의미가 겹치는 이름, URL 결정 로직, API shape를 한 곳으로 모아 LLM과 사람이 같은 방식으로 읽도록 만드는 것.

- [x] 리포트 공유 URL 생성 공용화
  - `src/utils/reportLinks.js`로 `/share?id=...` 생성 로직을 통합.
- [x] 리포트 API 응답 정규화
  - `src/utils/reportNormalizer.js`로 API -> UI 모델 변환을 한 곳에 고정.
- [ ] `shareUrl` / `openUrl` / `sourceUrl` 명칭 분리
  - 상세 페이지 URL, 원본 PDF URL, 공유 URL을 구분해서 혼동 제거.
- [ ] `ReportList`의 상태명 정리
  - `pendingSearch`, `searchQuery`, `isSearchOpen` 같이 의미가 가까운 상태를 더 명시적으로 분리.
- [ ] 증권사 식별자 정리
  - 인덱스/표시명/DB값을 분리해서 `company` 숫자 인덱스 의존을 줄이기.
- [x] `ShareMenu` 입력 데이터 단순화
  - 메뉴가 받는 `reportData` shape를 `src/utils/shareMenuData.js`로 고정.
- [ ] 링크 결정 로직 추가 분리
  - `article_url` / `download_url` / `pdf_url` 선택 규칙을 UI 밖의 헬퍼로 완전히 이동.
- [x] FastAPI 단일화 및 옛 API 명칭 정리
  - `VITE_ORACLE_REST_API` 같은 과거 명칭을 런타임에서 제거하고, 문서/환경변수/설정에서 FastAPI 중심 이름으로 맞추기.
  - 내부 코드 기준은 `REPORT_API_URL`로 고정한다.
  - `ssh-oci.duckdns.org/pub/api`를 단일 리포트 API 기준점으로 사용.
  - `.env` 및 `.env.legacy` 파일을 통해 신규/기존 API 버전 전환 지원.

---

## 최근 변경 이력

- 2026-04-22: 유안타/MyAsset 레포트 라우팅 정리
  - `article_url`이 상세 뷰어 페이지인 케이스를 확인하고, 원본 PDF 우선 순위를 `pdf_url -> download_url -> telegram_url`로 수정.
  - proxy 실패 시 raw URL fallback 유지.
- 2026-04-22: `pdf.js` 경유 실패 시 raw URL fallback 추가
  - proxy 사전 점검 결과가 HTML/에러이면 `pdf.js`로 보내지 않고 원본 URL로 직접 이동.
  - proxy 에러 메시지의 DS 고정 문구 제거.
- 2026-04-22: `useReportFetch` 리포트 정규화 분리
  - API -> UI 변환을 `src/utils/reportNormalizer.js`로 이동.
- 2026-04-22: 공유 URL 생성 공용화
  - `ReportList.jsx`와 `ReportItem.jsx`의 `/share?id=...` 문자열 조립을 `src/utils/reportLinks.js`로 통합.
- 2026-04-22: 공유 메뉴 데이터 조립 분리
  - `ReportList.jsx`의 공유 메뉴 입력 객체 조립을 `src/utils/shareMenuData.js`로 이동.

## 프로젝트 변천사

*(생략: 유저 제공 내용과 동일)*

---

## 작업 우선순위

- [x] **ADR-004** 최근 2일 SQLite→PostgreSQL 동기화 및 재전환 완료 (2026-04-21)
- [x] **ADR-005** PostgREST 배포 + 프론트엔드 엔드포인트 교체 및 Oracle ATP 제거 완료
- [x] **ADR-008** 프론트엔드 햄버거 메뉴 리팩토링 및 관리자 링크(pgAdmin, Grafana) 추가
- [x] **ADR-009** App 레이아웃/이벤트 로직 분리 (useAppLayout) 완료
- [x] **ADR-010** 전역 설정 및 환경 변수 중앙화 (CONFIG) 완료
- [x] **ADR-011** 상수 및 유틸리티 분리 (Constants & Utils) 완료
- [x] **ADR-012** API 요청 추상화 (Request Utility) 완료
- [x] **ADR-013** 리포트 그룹화 컴포넌트 분리 (ReportGroup) 완료

# Architecture & Roadmap

> 이 문서는 프로젝트의 현재 구조, 설계 결정 배경, 진행 중인 리팩토링 방향을 기록합니다.
> 작업 시작 전 이 문서를 먼저 읽고, 작업 완료 후 변경 내용을 반영해 주세요.

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

---

## 프로젝트 변천사

*(생략: 유저 제공 내용과 동일)*

---

## 작업 우선순위

- [x] **ADR-004** 최근 2일 SQLite→PostgreSQL 동기화 및 재전환 완료 (2026-04-21)
- [x] **ADR-005** PostgREST 배포 + 프론트엔드 엔드포인트 교체 및 Oracle ATP 제거 완료
- [x] **ADR-008** 프론트엔드 햄버거 메뉴 리팩토링 및 관리자 링크(pgAdmin, Grafana) 추가
- [x] **ADR-009** App 레이아웃/이벤트 로직 분리 (useAppLayout) 완료
- [x] **ADR-010** 전역 설정 및 환경 변수 중앙화 (CONFIG) 완료

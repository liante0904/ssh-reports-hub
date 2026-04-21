# Architecture & Roadmap (Frontend)

> 이 문서는 `ssh-reports-hub` 프론트엔드 프로젝트의 구조와 설계 결정을 기록합니다.

---

## 현재 스택 (2026-04-21 기준)

### 프론트엔드
- **Framework**: React 19 (Vite)
- **State Management**: React Context API (`ReportContext`)
- **Routing**: React Router v6
- **Deployment**: Netlify (Functions 활용)
- **Icons**: Emoji 기반 (추가 라이브러리 최소화)

---

## 아키텍처 결정 기록 (ADR)

### ADR-001 ~ ADR-007 (백엔드/인프라)
*※ 해당 내용은 백엔드 레포지토리의 설계 결정을 따름 (PostgreSQL 전환, ConfigManager 도입 등)*

### ADR-008: 프론트엔드 컴포넌트 리팩토링 및 인증 로직 안정화
- **상태:** 완료 (2026-04-21)
- **배경:** 
    - `HamburgerMenu.jsx`가 비대해지면서(250+ lines) 가독성이 떨어짐.
    - 비즈니스 로직(키워드 관리)과 UI가 섞여 있어 수정 시 사이드 이펙트 발생.
    - 함수 참조값 변화로 인해 `useEffect` 무한 루프 삽질 발생.
- **결정:**
    1. **컴포넌트 분리**: `AdminSection.jsx`를 분리하여 관리자 링크 리스트를 선언적으로 관리.
    2. **로직 캡슐화**: 키워드 CRUD 로직을 `useKeywords.js` 커스텀 훅으로 분리.
    3. **Context 통합**: 로그아웃(`logout`) 함수를 `ReportContext`로 이동하여 전역에서 안정적인 참조값 제공.
- **효과:** 
    - `HamburgerMenu.jsx` 코드량 50% 감소.
    - 부모의 리렌더링이 자식 훅의 무한 루프를 유발하지 않도록 구조적 차단.
    - 인증 상태와 유틸리티의 단일 진실 소스(SSOT) 확보.

---

## 프로젝트 변천사 (프론트엔드)

### 2026-04-21: 관리자 도구 확장 및 구조 개선
- **관리자 전용 메뉴 확장**: pgAdmin, Grafana 링크 추가.
- **구조 리팩토링**: 
    - `src/components/menu/AdminSection.jsx` 생성.
    - `src/hooks/useKeywords.js` 생성.
    - `ReportContext`에 `logout` 기능 통합.
- **문서화**: README 및 GEMINI.md 최신화.

---

## 작업 우선순위 (Frontend Next)
- [ ] **ADR-005 대응**: Oracle ATP 제거에 따른 API 엔드포인트 PostgREST로 전면 교체.
- [ ] **성능 최적화**: 레포트 목록 렌더링 시 메모이제이션(`useMemo`, `memo`) 적용 검토.
- [ ] **에러 핸들링**: API 호출 실패 시 사용자 알림(Toast) UI 추가.

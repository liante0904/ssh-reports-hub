# AGENTS.md — LLM 작업 규칙

## 필수 규칙

### 1. 새 API 호출 추가 시 반드시 2개 파일 같이 수정
- `API_REFERENCE.md` — 엔드포인트 문서화
- `test/integration/api.test.js` — 엔드포인트 테스트 추가
- CI에서 `test/verify-api-coverage.js` 가 검증함. 빠뜨리면 머지 불가.

### 2. 모든 API 호출은 `src/utils/api.js` 의 `request()` 사용
- 인증 토큰 자동 주입됨 (`localStorage.auth_token`)
- 401 응답 시 자동 로그아웃
- 기본 타임아웃 10초

### 3. 새 유틸 함수 추가 시 `test/unit/utils.test.js` 에 테스트 추가
- 순수 함수는 unit test 필수 (서버 없이 검증 가능)

## 프로젝트 구조
```
src/
  utils/api.js          ← 전역 API 클라이언트 (수정 시 위 규칙 확인)
  utils/reportFetch.js  ← 검색 URL 빌더
  utils/reportLinks.js  ← PDF 프록시 + 공유 링크
  hooks/                ← 데이터 페칭 훅
  context/ReportContext.jsx  ← 전역 상태 (검색, 테마, 인증)
  components/           ← UI 컴포넌트
```

## 서버 정보

| 호스트명 | IP | 역할 | SSH 별칭 |
|---|---|---|---|
| 배포 서버 (Production) | `132.145.91.78` | 실질 소스 실행 및 배포 서버 | `ssh oci` |
| 테스트 서버 (Development) | `64.110.82.78` | 개발 및 테스트 서버 (현재) | `ssh oci2` |

## 아키텍처
```
React 19 + Vite → Netlify (SPA)
API: FastAPI (ssh-oci.duckdns.org/external/api)
PDF Proxy: /.netlify/functions/proxy, /.netlify/functions/proxy-ds
Share: /.netlify/functions/share
```

## 명령어
```
npm run dev              ← 개발 서버
npm run test:unit        ← 유닛 테스트
npm run test:integration ← API 통합 테스트
npm run test:coverage    ← API 커버리지 검증 (CI에서 블로킹)
```

## 작업 시 주의
- `src/constants/config.js` 에 API URL 정의되어 있음
- `import.meta.env.VITE_*` 로 환경변수 접근
- `localStorage` 키: `auth_token`, `telegram_user`, `theme`, `report_favorites`
- 리포트 아이템은 `normalizeReportItem()` 를 통해 정규화
- DS투자증권은 PDF 다운로드 시 `proxy-ds` 함수 경유

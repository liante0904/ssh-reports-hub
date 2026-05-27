# 증권사 실시간 레포트 모아보기

React를 사용하여 구축된 주식 리포트 조회용 웹 애플리케이션입니다.

## Workspace Boundary

This repository is public-only. See [NOTICE.md](./NOTICE.md) for the required boundary rules.

## ✨ 주요 기능

- **실시간 리포트**: 28개 증권사의 리포트를 실시간으로 수집하여 제공합니다.
- **🔮 전망(Outlook)**: 연도별 전망 리포트를 한눈에 모아보고 연도별 필터링을 지원합니다.
- **검색 및 태그**: 제목, 작성자뿐만 아니라 태그, 산업, 종목명 검색을 지원하며 리포트별 태그 뱃지를 표시합니다.
- **키워드 알림**: 텔레그램 로그인을 통해 관심 키워드에 대한 실시간 알림을 설정할 수 있습니다.
- **관리자 도구**: 실시간 시스템 메트릭(CPU/RAM/DISK) 시각화 및 로그 뷰어 기능을 제공합니다.
- **AI 리포트 요약**: DeepSeek API를 활용하여 PDF 리포트 내용을 자동으로 요약하고 전용 필터를 통해 제공합니다.
- **무한 스크롤**: 사용자가 페이지 하단으로 스크롤하면 자동으로 다음 리포트를 불러옵니다.
- **반응형 UI**: 데스크톱 및 모바일 환경에 최적화된 UI를 제공하며, 다크 모드 및 테마 컬러를 지원합니다.
- **인증 뱃지**: 헤더에서 로그인 상태를 직관적으로 확인하고 세션을 유지합니다.

## 🏦 제공 증권사

- LS증권
- 신한증권
- NH투자증권
- 하나증권
- KB증권
- 삼성증권
- 상상인증권
- 신영증권
- 미래에셋증권
- 현대차증권
- 키움증권
- DS투자증권(보완중)
- 유진투자증권
- 한국투자증권
- 다올투자증권
- 토스증권
- 리딩투자증권
- 대신증권
- IM증권
- DB금융투자
- 메리츠증권
- 한화투자증권
- 한양증권
- BNK투자증권
- 교보증권
- IBK투자증권(보완중)
- SK증권

## 🛠️ 기술 스택

- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router
- **UI**: React Infinite Scroll Component
- **Linting**: ESLint

## ⚙️ 시작하기

### 1. 프로젝트 복제

```bash
git clone <repository-url>
cd ssh-reports-hub
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
make local
```

## 📂 프로젝트 구조

```text
.
├── netlify/functions/     # Netlify Serverless Functions (API Proxy, Share)
├── src/
│   ├── components/        # React UI 컴포넌트
│   ├── context/           # 전역 상태 관리 (ReportContext)
│   ├── hooks/             # 커스텀 훅 (비즈니스 로직 분리)
│   ├── constants/         # API 설정, 증권사 목록 등 상수
│   └── utils/             # API 클라이언트, 데이터 정규화, 유틸리티
├── test/
│   ├── unit/              # 단위 테스트 (Vitest/Jest)
│   └── integration/       # API 통합 테스트
├── docs/                  # 추가 상세 문서 (PDF 라우팅 등)
├── AGENTS.md              # LLM 작업 규칙 및 프로젝트 가이드
└── ARCHITECTURE.md        # 아키텍처 결정 기록 (ADR) 및 로드맵
```

## 📜 사용 가능한 스크립트

- `make local`: Vite dev 서버를 실행합니다.
- `make netlify`: Netlify Dev 환경에서 앱을 실행합니다.
- `make dev`: Vite dev 서버를 실행합니다.
- `make tunnel`: SSH 별칭 `oci`를 사용해 `localhost:8888` 터널을 엽니다.
- `npm run dev`: Vite dev 서버를 실행합니다.
- `npm run netlify`: Netlify Dev 환경에서 앱을 실행합니다.
- `npm run netlify:legacy`: 기존 API 환경으로 앱을 실행합니다.
- `npm run build`: 프로덕션용으로 앱을 빌드합니다.
- `npm run lint`: ESLint를 사용하여 코드 스타일을 검사합니다.
- `npm run preview`: 프로덕션 빌드를 로컬에서 미리 봅니다.

## 🧪 테스트 및 품질 관리

- `npm run test:unit`: 유틸리티 및 커스텀 훅 단위 테스트 실행.
- `npm run test:integration`: FastAPI 서버 연동 통합 테스트 실행.
- `npm run test:coverage`: API 엔드포인트 커버리지 검증 (CI에서 필수).
- `npm run lint`: 코드 스타일 및 정적 분석.

## 🚀 배포 환경변수

- `VITE_API_URL`: 프론트 공용 API 기본 주소
- `VITE_REPORT_API_URL`: 레포트 조회용 API 주소
- `VITE_TABLE_NAME`: 레포트 테이블명

레포트 조회는 기본적으로 `https://ssh-oci.duckdns.org/pub/api`를 사용하며, `.env` 파일을 통해 변경 가능합니다.

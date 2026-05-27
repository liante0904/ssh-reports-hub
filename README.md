# 증권사 실시간 레포트 모아보기

React를 사용하여 구축된 주식 리포트 조회용 웹 애플리케이션입니다.

## Workspace Boundary

This repository is public-only. See [NOTICE.md](./NOTICE.md) for the required boundary rules.

## ✨ 주요 기능

- **키워드 알림**: 텔레그램 로그인을 통해 관심 키워드에 대한 실시간 알림을 설정할 수 있습니다.
- **관리자 도구**: VPN 주소를 통한 VSCode, Docker, pgAdmin, Grafana 등 관리 환경 접근 기능을 제공합니다.
- **무한 스크롤**: 사용자가 페이지 하단으로 스크롤하면 자동으로 다음 리포트를 불러옵니다.
- **검색**: 전체 리포트 내에서 원하는 내용을 검색할 수 있는 오버레이 형태의 검색 기능을 제공합니다.
- **반응형 UI**: 데스크톱 및 모바일 환경에 최적화된 UI를 제공합니다.
  - 스크롤에 따라 동적으로 사라지거나 나타나는 헤더와 하단 네비게이션
  - 플로팅 메뉴 및 햄버거 메뉴를 통한 추가 기능 접근

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

## 🚀 배포 환경변수

- `VITE_API_URL`: 프론트 공용 API 기본 주소
- `VITE_REPORT_API_URL`: 레포트 조회용 API 주소
- `VITE_TABLE_NAME`: 레포트 테이블명

레포트 조회는 기본적으로 `https://ssh-oci.duckdns.org/pub/api`를 사용하며, `.env` 파일을 통해 변경 가능합니다.

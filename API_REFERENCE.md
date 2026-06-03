# API Reference — ssh-reports-hub 프론트엔드

> **목적**: LLM이 프론트엔드 코드를 수정할 때 실제 사용 중인 모든 API 엔드포인트를 정확히 알 수 있도록 정리한 문서.
> 테스트 코드(`test/`)와 1:1 대응되도록 구성했다.

---

## 환경 변수 설정

```
VITE_API_URL    = https://ssh-oci.duckdns.org   (기본값, 업스트림 FastAPI 서버)
VITE_API_PATH   = /external/api                  (기본값, API 경로 prefix)
VITE_REPORT_API_URL = (VITE_API_URL + VITE_API_PATH 의 자동 조합)
VITE_TABLE_NAME = api
VITE_VPN_ADDR   = (설정 시 VPN 관리자 링크 활성화)
VITE_TELEGRAM_BOT_ID   = 1372612160
VITE_TELEGRAM_BOT_NAME = ebest_noti_bot
```

---

## 1. FastAPI Backend API (업스트림)

**Base**: `{VITE_API_URL}{VITE_API_PATH}` = `https://ssh-oci.duckdns.org/external/api`

### 1.1 리포트 검색

```
GET {BASE}/external/api/search/?{params}
```

| Param | Type | 필수 | 설명 |
|-------|------|------|------|
| `sort_by` | `"time"` | - | 정렬 기준 (기본: time desc) |
| `limit` | number | - | 페이지 크기 (기본값 서버에서 결정) |
| `offset` | number | - | 페이지 오프셋 |
| `sort` | `"company"` | - | 증권사별 정렬 |
| `title` | string | - | 제목 검색 |
| `writer` | string | - | 작성자 검색 |
| `tag` | string | - | 태그 검색 |
| `sector` | string | - | 산업(섹터) 검색 |
| `stock` | string | - | 종목명 검색 |
| `company` | string | - | 증권사 order 번호 필터 |
| `board` | number | - | 게시판 번호 필터 |
| `mkt_tp` | `"global"` | - | 글로벌 마켓만 필터 |
| `has_summary` | `"true"` | - | AI 요약 존재 필터 |
| `outlook` | `"true"` | - | 전망 리포트만 필터 |
| `outlook_year` | number | - | 특정 연도 전망 필터 (e.g. 2026) |
| `report_id` | number | - | 단일 리포트 조회 (share 함수에서 사용) |

**Response**:
```json
{
  "items": [
    {
      "report_id": 12345,
      "firm_nm": "삼성증권",
      "article_title": "리포트 제목",
      "reg_dt": "20240421",
      "save_time": "2024-04-21T10:00:00",
      "writer": "홍길동",
      "telegram_url": "https://...",
      "download_url": "https://...",
      "article_url": "https://...",
      "pdf_url": "https://...",
      "pdf_archive": {
        "file_path": "...",
        "file_size": 123456,
        "page_count": 15,
        "archive_status": "completed",
        "file_name": "report.pdf",
        "has_text": true,
        "is_encrypted": false,
        "storage_backend": "local",
        "storage_key": "...",
        "author": "...",
        "created_at": "2024-05-09T12:00:00",
        "updated_at": "2024-05-09T12:00:00",
        "last_accessed_at": "2024-05-09T12:00:00"
      },
      "sec_firm_order": 5,
      "firm_id": 5,
      "article_board_order": 1,
      "gemini_summary": "AI 요약 텍스트...",
      "mkt_tp": "KR",
      "main_ch_send_yn": "Y",
      "key": "...",
      "pdf_archive": "..."
    }
  ],
  "hasMore": true,
  "count": 1234,
  "limit": 20,
  "offset": 0,
  "links": [
    { "rel": "self", "href": "..." }
  ]
}
```

**테스트**: `test/integration/api.test.js` Section 2, 4
**호출 위치**:
- `src/hooks/useReportFetch.js` → `buildReportFetchUrl()` → `/external/api/search`
- `src/components/HomeDashboard.jsx` → 글로벌 섹션 프리뷰: `/external/api/search?mkt_tp=global`
- `src/utils/reportFetch.js` → URL 빌드 로직
- `netlify/functions/share.js` → `buildReportSearchUrl()` → 단일 리포트 조회

---

### 1.2 산업(Industry) 리포트 조회

```
GET {BASE}/external/api/industry?{params}
```

| Param | Type | 필수 | 설명 |
|-------|------|------|------|
| `limit` | number | - | 페이지 크기 (기본: 100, 최대: 100) |
| `offset` | number | - | 페이지 오프셋 |
| `company` | string | - | 증권사 order 번호 필터 |
| `board` | number | - | 게시판 번호 필터 |
| `writer` | string | - | 작성자 검색 |
| `title` | string | - | 제목 검색 |
| `mkt_tp` | `"global"`\|`"domestic"` | - | 마켓 타입 필터 |

**Response**: `GET /search`와 동일한 형식. `pdf_archive.page_count >= 10` 필터가 서버에서 자동 적용됨 (page_count 정보가 없으면 통과).

**특징**:
- `INDUSTRY_REPORT_BOARD_FILTERS` 기반으로 증권사별 산업분석 게시판만 조회
- 종목코드((071050) 등)가 포함된 기업분석 리포트 자동 제외
- `page_count >= 10` 서버사이드 필터 적용 (아카이브 정보 없는 리포트는 그대로 표시)

**테스트**: `test/integration/api.test.js` Section 2.1
**호출 위치**:
- `src/utils/reportFetch.js` → `/industry` 경로에서 `/external/api/industry`로 분기
- `src/components/HomeDashboard.jsx` → 산업레포트 섹션 프리뷰

---

### 1.3 FnGuide 종목요약 조회

```
GET {BASE}/api/fnguide/report-summaries?{params}
```

> 이 엔드포인트는 `VITE_API_PATH` prefix(`/external/api`)를 사용하지 않고 `VITE_API_URL`에 직접 붙는다.

| Param | Type | 필수 | 설명 |
|-------|------|------|------|
| `q` | string | - | 회사명, 제목, 요약 본문 검색 |
| `provider` | string | - | 증권사/제공자 필터 |
| `report_date` | string | - | 특정 리포트 일자 필터 |
| `limit` | number | - | 페이지 크기 |
| `offset` | number | - | 페이지 오프셋 |

**Response**:
```json
[
  {
    "summary_id": 1,
    "report_date": "2026-06-03",
    "provider": "삼성증권",
    "author": "홍길동",
    "company_name": "삼성전자",
    "company_code": "005930",
    "report_title": "리포트 제목",
    "summary_text": "요약 본문",
    "opinion": "BUY",
    "target_price": "90000",
    "prev_close": "75000",
    "pdf_url": "https://...",
    "article_url": "https://..."
  }
]
```

**테스트**: `test/integration/api.test.js` Section 2.2
**호출 위치**:
- `src/components/FnGuideList.jsx` → 종목요약 목록 조회
- `src/components/HomeDashboard.jsx` → 종목요약 섹션 프리뷰

---

### 1.4 증권사(Company) 목록

```
GET {BASE}/external/api/companies
```

**Response**:
```json
[
  { "name": "LS증권", "report_count": 42, "sec_firm_order": 0 },
  { "name": "삼성증권", "report_count": 15, "sec_firm_order": 5 }
]
```

**테스트**: `test/integration/api.test.js` line 123-145
**호출 위치**:
- ❌ 프론트엔드에서 **직접 호출하지 않음**. `CONFIG.API.COMPANIES_URL`로 정의만 되어 있고, 증권사 목록은 `src/constants/firms.js`의 `FIRM_NAMES` 상수를 사용.

---

### 1.5 게시판(Board) 목록

```
GET {BASE}/external/api/boards?company={sec_firm_order}
```

**Response**:
```json
[
  { "name": "기업분석", "report_count": 30, "article_board_order": 0 },
  { "name": "산업분석", "report_count": 12, "article_board_order": 1 }
]
```

**테스트**: `test/integration/api.test.js` line 148-161
**호출 위치**:
- `src/context/ReportContext.jsx` line 80: `request(\`${CONFIG.API.BOARDS_URL}?company=${companyIndex}\`)`
- 프론트엔드는 `report_count > 0`인 보드만 보여줌

---

## 2. FastAPI — 인증 / 키워드 / 즐겨찾기 (API_PATH prefix 없음)

> ⚠️ **주의**: 이 엔드포인트들은 `VITE_API_PATH` prefix(`/external/api`)를 사용하지 않고 `VITE_API_URL`에 직접 붙는다.

### 2.1 Telegram 인증

```
POST {BASE}/external/auth/telegram
Content-Type: application/json
Authorization: none (skipAuth)
```

**Request Body**: Telegram Login Widget이 반환하는 사용자 객체 그대로 전달
```json
{
  "id": 123456789,
  "first_name": "홍길동",
  "username": "hong",
  "auth_date": 1712345678,
  "hash": "..."
}
```

**Response**:
```json
{
  "access_token": "jwt-token...",
  "user": {
    "id": 123456789,
    "first_name": "홍길동",
    "is_admin": false
  }
}
```

> `access_token` / `token` / `auth_token` / `jwt` 중 먼저 발견된 필드가 `auth_token`으로 localStorage에 저장됨.

**테스트**: `test/integration/api.test.js` Section 2.5 (더미 POST로 엔드포인트 존재 확인)
**호출 위치**:
- `src/hooks/useTelegramAuth.js`: `request(\`${CONFIG.API.BASE_URL}/external/auth/telegram\`, { method: 'POST', skipAuth: true })`

---

### 2.2 키워드 조회

```
GET {BASE}/keywords
Authorization: Bearer {token}
```

**Response**: 아래 셋 중 하나 (프론트엔드가 자동 정규화)
```json
// 형태 A (배열)
[ { "keyword": "반도체", "is_active": true } ]

// 형태 B
{ "items": [ { "keyword": "반도체", "is_active": true } ] }

// 형태 C
{ "keywords": [ { "keyword": "반도체", "is_active": true } ] }
```

**호출 위치**:
- `src/hooks/useKeywords.js` line 34: `request(\`${CONFIG.API.BASE_URL}/keywords\`)`

---

### 2.3 키워드 동기화

```
POST {BASE}/keywords/sync
Content-Type: application/json
Authorization: Bearer {token}

{ "keywords": ["반도체", "AI", "로봇"] }
```

**Response**: `GET /keywords`와 동일한 형식. 프론트엔드는 `is_active: true`만 필터링.

**호출 위치**:
- `src/hooks/useKeywords.js` line 51: `request(\`${CONFIG.API.BASE_URL}/keywords/sync\`, { method: 'POST', body: ... })`

---

### 2.4 즐겨찾기 목록 조회

```
GET {BASE}/favorites
Authorization: Bearer {token}
```

**Response**:
```json
{
  "items": [
    {
      "report_id": 12345,
      "article_title": "리포트 제목",
      "firm_nm": "삼성증권",
      "reg_dt": "20240421",
      "...": "tbl_sec_reports와 JOIN된 전체 필드"
    }
  ]
}
```

> 즐겨찾기 페이지에서는 서버가 `tbl_sec_reports`와 JOIN하여 풀 리포트 데이터를 내려준다. 프론트엔드는 `normalizeReportItem()`으로 정규화 후 날짜별 그룹핑.

**호출 위치**:
- `src/components/ReportList.jsx` line 54, 87, 103, 132: `request(\`${baseUrl}/favorites\`)`

---

### 2.5 즐겨찾기 추가 / 삭제

```
POST   {BASE}/favorites/{report_id}    ← 추가
DELETE {BASE}/favorites/{report_id}    ← 삭제
Authorization: Bearer {token}
```

**Request Body**: 없음 (POST 시 빈 body)
**Response**: 프론트엔드는 응답 본문을 사용하지 않고 HTTP status만 확인

**호출 위치**:
- `src/components/ReportList.jsx` line 218: `request(\`${baseUrl}/favorites/${id}\`, { method: isAdding ? 'POST' : 'DELETE' })`
- `src/components/ReportList.jsx` line 83: 초기 동기화 시 `POST`로 로컬 즐겨찾기 업로드

---

## 3. FastAPI — Admin API

### 3.1 시스템 메트릭

```
GET {BASE}/admin/metrics
Authorization: Bearer {token}
```

**Response**:
```json
{
  "overall": "online",
  "database": { "status": "online" },
  "cpu": { "percent": 25, "cores": 4, "frequency_mhz": 2400 },
  "memory": { "percent": 45, "used_gb": 1.5, "total_gb": 3.8 },
  "disk": { "percent": 55, "used_gb": 12.0, "total_gb": 20.0 },
  "reports": {
    "total": 123456,
    "today_inserts": 42,
    "by_firm_today": [ { "firm": "삼성증권", "count": 15 } ],
    "archive_history": [ { "label": "05/09", "count": 120 } ],
    "active_firms_today": 20
  },
  "system": { "uptime_days": 30 },
  "last_activity": { "last_save_time": "2024-05-09T12:00:00" }
}
```

**호출 위치**:
- `src/components/AdminConsole.jsx` line 134: `fetch(\`${baseUrl}/admin/metrics\`)`

**테스트**: ❌ 별도 테스트 없음 (AdminConsole 전용, 관리자 인증 필요)

---

### 3.2 로그 디렉토리 조회

```
GET {BASE}/admin/logs?path={경로}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "entries": [
    {
      "name": "app.log",
      "type": "file",
      "full_path": "/var/log/app.log",
      "size": "1.2MB",
      "modified": "2024-05-09 12:00",
      "description": "애플리케이션 로그",
      "archived": false
    },
    {
      "name": "archive",
      "type": "directory",
      "full_path": "/var/log/archive",
      "description": "보관된 로그"
    }
  ],
  "current_path": "/var/log"
}
```

**호출 위치**:
- `src/components/AdminConsole.jsx` line 281: `fetch(\`${API_BASE}/admin/logs${params}\`)`

---

### 3.3 로그 파일 내용 조회

```
GET {BASE}/admin/logs/view?file={full_path}&lines=500&tail=true
Authorization: Bearer {token}
```

**Response**:
```json
{
  "content": "2024-05-09 12:00:00 | INFO    | Server started\n..."
}
```

**호출 위치**:
- `src/components/AdminConsole.jsx` line 306: `fetch(\`${API_BASE}/admin/logs/view?${params}\`)`

---

### 3.4 AI 요약 생성 (관리자)

```
POST {BASE}/admin/reports/{report_id}/summarize
Authorization: Bearer {token}
Timeout: 180000ms (3분)
```

**Response**:
```json
{ "status": "success" }
// 또는
{ "status": "skipped" }
```

**호출 위치**:
- `src/components/ReportList.jsx` line 249: `request(\`${baseUrl}/admin/reports/${reportId}/summarize\`, { method: 'POST', timeout: 180000 })`

---

### 3.5 Health Check

```
GET {BASE}/health
Authorization: none
```

**Response**:
```json
{ "status": "ok" }
```

**호출 위치**:
- ❌ 프론트엔드에서 직접 호출하지 않음
- 테스트 코드에서만 사용: `test/integration/api.test.js` line 80, `test/admin-status.test.js` line 49

---

## 4. Netlify Functions (Serverless)

> Base: `{origin}/.netlify/functions/`

### 5.1 PDF Proxy (일반 증권사)

```
GET  /.netlify/functions/proxy?url={encoded_url}&filename={encoded_filename}&referer={encoded_board_url}
HEAD /.netlify/functions/proxy?warmup=true   ← Cold Start 방지용 워밍업
```

**Response**:
- `GET`: `Content-Type: application/pdf` + Base64 인코딩된 PDF 바이너리
- `HEAD`: `Content-Type: application/pdf` + 빈 body (워밍업/프리페치)
- DS URL 호출 시 자동으로 proxy-ds로 리다이렉트하지 않음 (proxy-ds를 별도 호출해야 함)

**특징**:
- 쿠키 프라이밍: `referer`(게시판 URL)에 먼저 방문해 쿠키를 획득한 후 PDF 다운로드
- DS URL은 자체 판별하여 별도 User-Agent/Cookie 전략 적용

**소스**: `netlify/functions/proxy.js`

---

### 5.2 PDF Proxy (DS투자증권 전용)

```
GET  /.netlify/functions/proxy-ds?url={encoded_url}&filename={encoded_filename}&referer={encoded_board_url}
HEAD /.netlify/functions/proxy-ds?warmup=true
```

**Response**: proxy와 동일. DS 전용 쿠키 헤더(`Sec-Fetch-*`) 사용.

**특징**:
- DS투자증권(`ds-sec.co.kr`) URL만 허용
- 게시판 URL에서 `download.php` → `board.php`로 자동 변환하여 쿠키 프라이밍
- PDF 시그니처(`%PDF`) 확인

**소스**: `netlify/functions/proxy-ds.js`

---

### 5.3 Share (공유 페이지 / 리다이렉트)

```
GET  /.netlify/functions/share?id={report_id}
HEAD /.netlify/functions/share?warmup=true
```

**동작 흐름**:
1. `id`로 FastAPI `/external/api/search/?report_id={id}` 호출
2. 리포트의 원본 PDF URL 확보 (pdf_url → download_url → telegram_url 순)
3. DB증권 게이트웨이(`whub.dbsec.co.kr`) 처리
4. 프록시 URL 생성 (`.netlify/functions/proxy` 또는 `proxy-ds`)
5. 일반 사용자 → 302 리다이렉트 (proxy URL 또는 원본 URL)
6. 봇(KakaoTalk, Telegram 등) → OG 메타 태그가 포함된 HTML 반환

**소스**: `netlify/functions/share.js`

---

### 5.4 Admin Status (사용 안 함)

```
GET /.netlify/functions/admin-status
```

> ❌ 프론트엔드에서 **호출하지 않음**. AdminConsole은 FastAPI `/admin/metrics`를 직접 호출한다.
> 이 함수는 독립적으로 `/health`와 `/pub/api/search/`를 체크하는 별도 헬스체크 유틸리티.

**소스**: `netlify/functions/admin-status.js`

---

## 5. Third-party Integrations

### 6.1 Telegram Login Widget

```js
window.Telegram.Login.auth(
  { bot_id: '1372612160', request_access: 'write', embed: 1 },
  (user) => { /* user 객체를 /external/auth/telegram 으로 전송 */ }
)
```

**호출 위치**: `src/components/HamburgerMenu.jsx` line 46-78

---

### 6.2 Telegram 봇 연결 (딥링크)

```
https://t.me/{bot_name}?start={user_id}
```

**호출 위치**: `src/components/menu/TelegramAuth.jsx` line 49

---

### 6.3 KakaoTalk 공유

```js
// SDK 방식
window.Kakao.Share.sendDefault({ objectType: 'feed', content: {...} })

// 폴백 URL 방식
https://sharer.kakao.com/talk/friends/picker/link?url={encoded_url}
```

**호출 위치**: `src/components/ShareMenu.jsx` line 50-77

---

### 6.4 Telegram 공유

```
https://t.me/share/url?url={encoded_text}
```

**호출 위치**: `src/components/ShareMenu.jsx` line 83

---

### 6.5 Native Share API

```js
navigator.share({ title, text })
```

**호출 위치**: `src/components/ShareMenu.jsx` line 88-93

---

## 6. 테스트 코드 매핑

### `test/unit/utils.test.js`

| 테스트 항목 | 대상 소스 | API 연관 |
|------------|----------|---------|
| Test 1: `formatDate` | `src/utils/date.js` | report 정규화 |
| Test 2: `FIRM_NAMES` | `src/constants/firms.js` | 증권사 상수 |
| Test 3: `normalizeReportItem` | `src/utils/reportNormalizer.js` | `/search` 응답 정규화 |
| Test 4: `hasGridSelection` | `src/utils/gridSelect.js` | 검색 UI |
| Test 5: `isDsReport` | `src/utils/reportLinks.js` | PDF 프록시 분기 |
| Test 6: `getShareUrl` | `src/utils/reportLinks.js` | `/share` 함수 링크 |
| Test 7: `getProxyPdfUrl` | `src/utils/reportLinks.js` | `/proxy`, `/proxy-ds` 호출 |
| Test 8: `getDirectUrl` | `src/utils/reportLinks.js` | 원본 vs 프록시 결정 |
| Test 9: `CONFIG` 구조 | `src/constants/config.js` | 전체 API URL 구성 |

### `test/unit/proxy-ds.test.js`

| 테스트 항목 | 대상 소스 | API 연관 |
|------------|----------|---------|
| Test 1: `decodeParam` | `netlify/functions/proxy-ds.js` | DS PDF 프록시 URI 디코딩 |
| Test 2: `buildBoardUrl` | `netlify/functions/proxy-ds.js` | download→board URL 변환 |
| Test 3: `isLikelyPdf` | `netlify/functions/proxy-ds.js` | PDF 시그니처 검증 |
| Test 4: `getCookieHeader` | `netlify/functions/proxy-ds.js` | Set-Cookie 헤더 파싱 (getSetCookie + fallback) |
| Test 5: `mergeCookies` | `netlify/functions/proxy-ds.js` | 메인+게시판 쿠키 병합 |
| Test 6: `createHeaders` | `netlify/functions/proxy-ds.js` | 브라우저 헤더 회귀 검증 |

### `test/integration/api.test.js`

| 섹션 | 테스트 대상 |
|------|------------|
| Section 1: 기본 인프라 | `GET /health` |
| Section 2: Public API | `GET /external/api/search/`, `/external/api/companies`, `/external/api/boards` |
| Section 3: 응답 시간 | latency 체크 |

### `test/admin-status.test.js`

| 테스트 항목 | 대상 |
|------------|------|
| Test 1: `/health` | 업스트림 헬스 체크 |
| Test 2: 응답 body 검증 | `status`, `services`, `cpu`, `memory`, `database`, `lastActivity` 필드 |

### `test/integration/share-ds-smoke.test.js`

| 테스트 항목 | 대상 |
|------------|------|
| share 함수 DS 스모크 테스트 | `/.netlify/functions/share` + DS 증권 리포트 |

---

## 7. 빠른 참조: API 호출처 → 엔드포인트

| 소스 파일 | HTTP | 엔드포인트 |
|----------|------|-----------|
| `src/hooks/useReportFetch.js:58` | GET | `/external/api/search?offset=&sort=&title=&writer=&company=&board=&mkt_tp=&has_summary=` |
| `src/components/HomeDashboard.jsx` | GET | `/api/fnguide/report-summaries?limit=&offset=` |
| `src/components/HomeDashboard.jsx` | GET | `/external/api/industry?limit=&offset=` |
| `src/components/HomeDashboard.jsx` | GET | `/external/api/search?limit=&offset=&mkt_tp=global` |
| `src/context/ReportContext.jsx:80` | GET | `/external/api/boards?company={order}` |
| `src/hooks/useKeywords.js:34` | GET | `/keywords` |
| `src/hooks/useKeywords.js:51` | POST | `/keywords/sync` |
| `src/hooks/useTelegramAuth.js` | POST | `/external/auth/telegram` |
| `src/components/ReportList.jsx:54,87,103,132` | GET | `/favorites` |
| `src/components/ReportList.jsx:83` | POST | `/favorites/{id}` (초기 업로드) |
| `src/components/ReportList.jsx:218` | POST/DELETE | `/favorites/{id}` (토글) |
| `src/components/ReportList.jsx:249` | POST | `/admin/reports/{id}/summarize` |
| `src/components/AdminConsole.jsx:134` | GET | `/admin/metrics` |
| `src/components/AdminConsole.jsx:281` | GET | `/admin/logs?path=` |
| `src/components/AdminConsole.jsx:306` | GET | `/admin/logs/view?file=&lines=&tail=` |
| `src/App.jsx:48` | HEAD | `/.netlify/functions/proxy?warmup=true` |
| `src/App.jsx:48` | HEAD | `/.netlify/functions/share?warmup=true` |
| `src/components/report/ReportItem.jsx:44-45` | HEAD | `/.netlify/functions/proxy?warmup=true` + `/.netlify/functions/share?warmup=true` |
| `src/utils/reportLinks.js:38` | GET | `/.netlify/functions/proxy?url=&filename=&referer=` (DS 프리페치) |
| `src/components/report/PDFViewerModal.jsx` | (iframe) | `/.netlify/functions/proxy?url=...` 또는 `/.netlify/functions/proxy-ds?url=...` |

---

## 8. 공통 패턴

### 인증
- 로그인 성공 시 `auth_token`을 `localStorage`의 `auth_token` 키에 저장
- `request()` 유틸은 자동으로 `Authorization: Bearer {token}` 헤더를 추가
- `skipAuth: true` 옵션으로 인증 헤더 생략 가능 (Telegram 인증 시)
- 401 응답 시 `logout()` 호출 → 토큰 삭제 + 페이지 리로드

### 응답 정규화
- `normalizeReportItem()` (`src/utils/reportNormalizer.js`): 서버 응답을 프론트엔드 모델로 변환
- `normalizeKeywordList()` (`src/hooks/useKeywords.js`): 배열/객체 래핑된 키워드 응답을 통일

### Cold Start 방지 (워밍업)
- 앱 시작 시 `requestIdleCallback`으로 Netlify Function에 `HEAD` + `?warmup=true` 신호 전송
- 리포트 항목에 마우스 hover/touch 시에도 동일한 워밍업 수행

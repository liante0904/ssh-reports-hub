/**
 * 유닛 테스트 - proxy-ds.js 순수 함수
 *
 * DS투자증권 다운로드 프록시의 핵심 로직 검증.
 * DS 서버 로직 변경으로 인한 회귀 방지 목적.
 *
 * 사용법:
 *   node test/unit/proxy-ds.test.js
 */

// ─── 테스트 헬퍼 ───
let passed = 0;
let failed = 0;

function assert(condition, label, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${label}${detail ? ` (${detail})` : ''}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ` (${detail})` : ''}`);
    failed++;
  }
}

function assertEqual(actual, expected, label) {
  const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
  if (isEqual) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    console.log(`     expected: ${JSON.stringify(expected)}`);
    console.log(`     actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertContains(haystack, needle, label) {
  if (haystack.includes(needle)) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label} — "${needle}" not found`);
    console.log(`     got: ${haystack}`);
    failed++;
  }
}

// ═══════════════════════════════════════════
// Test 1: decodeParam — URI 디코딩
// ═══════════════════════════════════════════
console.log('\n─── [Test 1] decodeParam (proxy-ds.js) ───');

function decodeParam(value = '') {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

assertEqual(decodeParam('https%3A%2F%2Fwww.ds-sec.co.kr%2Fbbs%2Fdownload.php'),
  'https://www.ds-sec.co.kr/bbs/download.php',
  'download URL 디코딩');
assertEqual(decodeParam('%5BDS%ED%88%AC%EC%9E%90%EC%A6%9D%EA%B6%8C%5D'),
  '[DS투자증권]',
  '한글 파일명 디코딩');
assertEqual(decodeParam(''), '', '빈 문자열 → 빈 문자열');
assertEqual(decodeParam('no-encoding'), 'no-encoding', '인코딩 없는 문자열 그대로');
assertEqual(decodeParam('%EC%A0%9C%EB%AA%A9'), '제목', 'UTF-8 인코딩 디코딩');
assertEqual(decodeParam(undefined), '', 'undefined → 빈 문자열');
// 잘못된 인코딩 → 원본 반환 (예: %GG)
const malformed = '%GG';
assert(decodeParam(malformed) === malformed, '잘못된 인코딩 → 원본 유지');

// ═══════════════════════════════════════════
// Test 2: buildBoardUrl — download URL → board URL 변환
// ═══════════════════════════════════════════
console.log('\n─── [Test 2] buildBoardUrl (proxy-ds.js) ───');

function buildBoardUrl(targetUrl, referer) {
  if (referer) {
    let resolved = referer;
    if (!/^https?:\/\//i.test(resolved)) {
      try {
        resolved = new URL(resolved, targetUrl).toString();
      } catch {
        resolved = null;
      }
    }
    if (resolved) return resolved;
  }

  try {
    const parsed = new URL(targetUrl);
    if (/\/bbs\/download\.php$/i.test(parsed.pathname)) {
      parsed.pathname = parsed.pathname.replace(/download\.php$/i, 'board.php');
      parsed.searchParams.delete('no');
      return parsed.toString();
    }
  } catch {
    // fallback
  }

  return targetUrl.replace('download.php', 'board.php');
}

// referer가 제공된 경우 referer를 그대로 사용
assertEqual(
  buildBoardUrl(
    'https://www.ds-sec.co.kr/bbs/download.php?bo_table=sub03_02&wr_id=3488&no=0',
    'https://www.ds-sec.co.kr/bbs/board.php?bo_table=sub03_02&wr_id=3488&page=1'
  ),
  'https://www.ds-sec.co.kr/bbs/board.php?bo_table=sub03_02&wr_id=3488&page=1',
  'referer 제공 시 referer 사용'
);

// referer가 없으면 download.php → board.php 자동 변환 + no 파라미터 제거
assertEqual(
  buildBoardUrl(
    'https://www.ds-sec.co.kr/bbs/download.php?bo_table=sub03_03&wr_id=2061&no=0',
    ''
  ),
  'https://www.ds-sec.co.kr/bbs/board.php?bo_table=sub03_03&wr_id=2061',
  'referer 없을 때 download→board 변환 + no 제거'
);

// 다른 증권사 URL은 변환 안 함 (fallback)
assertEqual(
  buildBoardUrl(
    'https://example.com/path/to/file.pdf',
    ''
  ),
  'https://example.com/path/to/file.pdf',
  'download.php 아닌 URL → 그대로'
);

// sub03_02 게시판 변환 확인
assertEqual(
  buildBoardUrl(
    'https://www.ds-sec.co.kr/bbs/download.php?bo_table=sub03_02&wr_id=3484&no=0',
    ''
  ),
  'https://www.ds-sec.co.kr/bbs/board.php?bo_table=sub03_02&wr_id=3484',
  'sub03_02 다운로드 → board 변환'
);

// 다중 파라미터 유지 확인
assertEqual(
  buildBoardUrl(
    'https://www.ds-sec.co.kr/bbs/download.php?bo_table=sub03_03&wr_id=2061&no=2&extra=1',
    ''
  ),
  'https://www.ds-sec.co.kr/bbs/board.php?bo_table=sub03_03&wr_id=2061&extra=1',
  'no만 제거, 나머지 파라미터 유지'
);

// ═══════════════════════════════════════════
// Test 3: isLikelyPdf — PDF 시그니처 검증
// ═══════════════════════════════════════════
console.log('\n─── [Test 3] isLikelyPdf (proxy-ds.js) ───');

function isLikelyPdf(buffer) {
  return buffer.length > 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF';
}

// 유효한 PDF 시그니처
const pdfBuffer = Buffer.from('%PDF-1.4\n%......', 'ascii');
assert(isLikelyPdf(pdfBuffer), 'PDF 시그니처 감지 (%PDF-1.4)');

const pdfBuffer2 = Buffer.from('%PDF-1.7\n......', 'ascii');
assert(isLikelyPdf(pdfBuffer2), 'PDF 시그니처 감지 (%PDF-1.7)');

// PDF 아닌 경우
const htmlBuffer = Buffer.from('<!doctype html><html>......', 'ascii');
assert(!isLikelyPdf(htmlBuffer), 'HTML → PDF 아님');

const textBuffer = Buffer.from('Hello World', 'ascii');
assert(!isLikelyPdf(textBuffer), '일반 텍스트 → PDF 아님');

// 너무 짧은 버퍼
const shortBuffer = Buffer.from('%PD', 'ascii');
assert(!isLikelyPdf(shortBuffer), '4바이트 미만 → PDF 아님');

const exact4Buffer = Buffer.from('%PDF', 'ascii');
assert(!isLikelyPdf(exact4Buffer), '정확히 4바이트 (%PDF) → 길이 부족으로 false');

const emptyBuffer = Buffer.from('');
assert(!isLikelyPdf(emptyBuffer), '빈 버퍼 → PDF 아님');

// 바이너리 파일
const binaryBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]); // PNG 시그니처
assert(!isLikelyPdf(binaryBuffer), 'PNG 바이너리 → PDF 아님');

// ═══════════════════════════════════════════
// Test 4: getCookieHeader — Set-Cookie 헤더 파싱
// ═══════════════════════════════════════════
console.log('\n─── [Test 4] getCookieHeader (proxy-ds.js) ───');

function getCookieHeader(res) {
  // 최신 Node.js runtime (getSetCookie 지원)
  if (typeof res.headers.getSetCookie === 'function') {
    const cookies = res.headers.getSetCookie();
    if (cookies && cookies.length > 0) {
      return cookies.map(c => c.split(';')[0].trim()).join('; ');
    }
  }

  // Fallback: set-cookie 헤더 직접 파싱
  const raw = res.headers.get('set-cookie');
  if (!raw) return '';

  // 여러 Set-Cookie가 콤마로 결합되어 올 수 있음 (expires 내 콤마는 제외)
  const parts = raw.split(/,(?=[^;]+?=)/);
  return parts.map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
}

// ── getSetCookie() 지원 환경 테스트 ──
{
  const mockHeaders = {
    getSetCookie: () => [
      'PHPSESSID=abc123; path=/',
      'auth_token=xyz789; expires=Thu, 21-May-2026 05:15:18 GMT; Max-Age=86400; path=/',
      'board_id=c3ViMDNfMDM=; path=/',
    ],
    get: () => null,
  };
  const result = getCookieHeader({ headers: mockHeaders });
  assertEqual(result,
    'PHPSESSID=abc123; auth_token=xyz789; board_id=c3ViMDNfMDM=',
    'getSetCookie() → 3개 쿠키 추출 (name=value만)');
}

{
  const mockHeaders = {
    getSetCookie: () => [],
    get: () => null,
  };
  assertEqual(getCookieHeader({ headers: mockHeaders }), '',
    'getSetCookie() 빈 배열 → 빈 문자열');
}

{
  const mockHeaders = {
    getSetCookie: () => null,
    get: () => null,
  };
  assertEqual(getCookieHeader({ headers: mockHeaders }), '',
    'getSetCookie() null → 빈 문자열');
}

// ── Fallback: set-cookie 헤더 직접 파싱 ──
{
  const mockHeaders = {
    getSetCookie: undefined, // 지원 안 함 → fallback
    get: (name) => {
      if (name === 'set-cookie') {
        return 'PHPSESSID=7tjravbdv764u63lan58b8p1v3; path=/, e1192aefb64683cc97abb83c71057733=c3ViMDNfMDM%3D; expires=Thu, 21-May-2026 05:15:18 GMT; Max-Age=86399; path=/, 2a0d2363701f23f8a75028924a3af643=NjQuMTEwLjgyLjc4; expires=Thu, 21-May-2026 05:15:18 GMT; Max-Age=86399; path=/';
      }
      return null;
    },
  };
  const result = getCookieHeader({ headers: mockHeaders });
  assertContains(result, 'PHPSESSID=7tjravbdv764u63lan58b8p1v3', 'fallback: PHPSESSID 추출');
  assertContains(result, 'e1192aefb64683cc97abb83c71057733=c3ViMDNfMDM%3D', 'fallback: 게시판 쿠키 추출');
  assertContains(result, '2a0d2363701f23f8a75028924a3af643=NjQuMTEwLjgyLjc4', 'fallback: IP 해시 쿠키 추출');
  // expires 내 콤마가 쿠키 구분자로 오인되지 않는지 확인
  assert(!result.includes('21-May-2026'), 'fallback: expires 날짜가 쿠키 값에 포함되지 않음');
}

{
  const mockHeaders = {
    getSetCookie: undefined,
    get: () => null,
  };
  assertEqual(getCookieHeader({ headers: mockHeaders }), '',
    'fallback: set-cookie 없음 → 빈 문자열');
}

// ── 단일 쿠키 fallback ──
{
  const mockHeaders = {
    getSetCookie: undefined,
    get: () => 'PHPSESSID=single123; path=/',
  };
  assertEqual(getCookieHeader({ headers: mockHeaders }),
    'PHPSESSID=single123',
    'fallback: 단일 쿠키 추출');
}

// ═══════════════════════════════════════════
// Test 5: mergeCookies — 쿠키 병합
// ═══════════════════════════════════════════
console.log('\n─── [Test 5] mergeCookies (proxy-ds.js) ───');

function mergeCookies(base, override) {
  const map = new Map();
  const parse = (str) => {
    if (!str) return;
    str.split(';').forEach(pair => {
      const trimmed = pair.trim();
      if (!trimmed) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        map.set(trimmed.substring(0, eqIdx), trimmed);
      }
    });
  };
  parse(base);
  parse(override);
  return Array.from(map.values()).join('; ');
}

// 기본 병합: base 쿠키 + override 쿠키 (override 우선)
{
  const base = 'PHPSESSID=base123; ip_hash=base456';
  const override = 'board_id=sub03_03; PHPSESSID=override123';
  const result = mergeCookies(base, override);
  assertContains(result, 'PHPSESSID=override123', 'merge: override 쿠키가 base 덮어씀');
  assertContains(result, 'ip_hash=base456', 'merge: base 전용 쿠키 유지');
  assertContains(result, 'board_id=sub03_03', 'merge: override 전용 쿠키 추가');
}

// override만 있는 경우
{
  const result = mergeCookies('', 'PHPSESSID=abc; board=e1192');
  assertEqual(result, 'PHPSESSID=abc; board=e1192', 'merge: base 빈 값 → override만 반환');
}

// base만 있는 경우
{
  const result = mergeCookies('PHPSESSID=abc; auth=xyz', '');
  assertEqual(result, 'PHPSESSID=abc; auth=xyz', 'merge: override 빈 값 → base만 반환');
}

// 둘 다 빈 경우
{
  const result = mergeCookies('', '');
  assertEqual(result, '', 'merge: 둘 다 빈 값 → 빈 문자열');
}

// 실제 DS 서버 응답 시뮬레이션
{
  const mainCookies = 'PHPSESSID=i8vteseed1b2hoa38p3i48ebs6; 2a0d2363701f23f8a75028924a3af643=NjQuMTEwLjgyLjc4';
  const boardCookies = 'e1192aefb64683cc97abb83c71057733=c3ViMDNfMDM%3D';
  const result = mergeCookies(mainCookies, boardCookies);
  assertContains(result, 'PHPSESSID=i8vteseed1b2hoa38p3i48ebs6', 'DS 시뮬: PHPSESSID 유지');
  assertContains(result, 'e1192aefb64683cc97abb83c71057733=c3ViMDNfMDM%3D', 'DS 시뮬: 게시판 인증 쿠키 추가');
  assertContains(result, '2a0d2363701f23f8a75028924a3af643=NjQuMTEwLjgyLjc4', 'DS 시뮬: IP 해시 쿠키 유지');
  // 중복 없는지 확인 (3개 키)
  const parts = result.split(';').filter(Boolean);
  assert(parts.length === 3, `DS 시뮬: 쿠키 3개 정확 (${parts.length}개)`, result);
}

// 빈 값이 포함된 쿠키 무시
{
  const result = mergeCookies('PHPSESSID=abc; ; ck_font_resize_rmv_class=;', '');
  assertContains(result, 'PHPSESSID=abc', 'merge: 빈 값 쿠키도 포함 (eqIdx>0 통과)');
}

// ═══════════════════════════════════════════
// Test 6: createHeaders — 브라우저 헤더 (회귀 방지)
// ═══════════════════════════════════════════
console.log('\n─── [Test 6] createHeaders (proxy-ds.js) ───');

function createHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'ko',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-CH-UA': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };
}

const headers = createHeaders();

// 필수 헤더 존재 확인
assert(headers['User-Agent'].includes('Chrome/148'), 'UA: Chrome 148 포함');
assert(headers['Accept-Language'] === 'ko', 'Accept-Language: ko (DS 서버 요구사항)');
assert(headers['Cache-Control'] === 'no-cache', 'Cache-Control: no-cache');
assert(headers['Pragma'] === 'no-cache', 'Pragma: no-cache');

// Sec-Fetch-* 헤더 검증 (DS 서버가 봇 판별에 사용)
assert(headers['Sec-Fetch-Dest'] === 'document', 'Sec-Fetch-Dest: document');
assert(headers['Sec-Fetch-Mode'] === 'navigate', 'Sec-Fetch-Mode: navigate');
assert(headers['Sec-Fetch-Site'] === 'same-origin', 'Sec-Fetch-Site: same-origin');
assert(headers['Sec-Fetch-User'] === '?1', 'Sec-Fetch-User: ?1');

// Sec-CH-UA-* 헤더 검증 (브라우저 클라이언트 힌트)
assert(headers['Sec-CH-UA'].includes('"Chromium"'), 'Sec-CH-UA: Chromium 포함');
assert(headers['Sec-CH-UA'].includes('"Google Chrome"'), 'Sec-CH-UA: Chrome 포함');
assert(headers['Sec-CH-UA-Mobile'] === '?0', 'Sec-CH-UA-Mobile: 데스크탑(?0)');
assert(headers['Sec-CH-UA-Platform'] === '"macOS"', 'Sec-CH-UA-Platform: macOS');

// DS 서버가 거부한 이전 헤더 포함 여부 확인 (회귀 테스트)
assert(!headers['Connection'], 'Connection 헤더 없음 (삭제됨)');
assert(!headers['Accept'].includes('application/pdf'), 'Accept에 application/pdf 없음 (실제 브라우저와 일치)');

console.log(`\n결과: ${passed} 통과, ${failed} 실패 (총 ${passed + failed}개)\n`);
process.exit(failed > 0 ? 1 : 0);

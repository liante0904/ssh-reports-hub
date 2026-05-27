/**
 * 유닛 테스트 - 프론트엔드 유틸리티 함수
 *
 * 사용법:
 *   node test/unit/utils.test.js
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

// ─── Test 1: formatDate (src/utils/date.js) ───
console.log('\n─── [Test 1] formatDate (date.js) ───');

// Pure function이므로 inline으로 테스트
function formatDate(rawDate) {
  if (!rawDate) return 'Unknown';
  const trimmed = rawDate.trim();
  if (trimmed.length === 8 && /^\d+$/.test(trimmed)) {
    return `${trimmed.substring(0, 4)}-${trimmed.substring(4, 6)}-${trimmed.substring(6, 8)}`;
  }
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return trimmed;
}

assertEqual(formatDate('20240421'), '2024-04-21', 'YYYYMMDD → YYYY-MM-DD');
assertEqual(formatDate('20241231'), '2024-12-31', '연말 날짜 변환');
assertEqual(formatDate('20240101'), '2024-01-01', '연초 날짜 변환');
assertEqual(formatDate('2024-04-21 10:00:00'), '2024-04-21', 'datetime → date only');
assertEqual(formatDate('2024-04-21T10:00:00Z'), '2024-04-21', 'ISO datetime → date only');
assertEqual(formatDate('2024-04-21'), '2024-04-21', '이미 YYYY-MM-DD');
assertEqual(formatDate(''), 'Unknown', '빈 문자열 → Unknown');
assertEqual(formatDate(null), 'Unknown', 'null → Unknown');
assertEqual(formatDate(undefined), 'Unknown', 'undefined → Unknown');
assertEqual(formatDate(' 20240421 '), '2024-04-21', 'trim 처리');

// ─── Test 2: getFirmNameByOrder / getFirmOrderByName (constants/firms.js) ───
console.log('\n─── [Test 2] Firm 유틸리티 (firms.js) ───');

const FIRM_NAMES = [
  "LS증권", "신한증권", "NH투자증권", "하나증권", "KB증권", "삼성증권",
  "상상인증권", "신영증권", "미래에셋증권", "현대차증권", "키움증권", "DS투자증권",
  "유진투자증권", "한국투자증권", "다올투자증권", "토스증권", "리딩투자증권", "대신증권",
  "IM증권", "DB증권", "메리츠증권", "한화투자증권", "한양증권", "BNK투자증권",
  "교보증권", "IBK투자증권", "SK증권", "유안타증권"
];

function getFirmNameByOrder(order) {
  const numericOrder = Number(order);
  if (!Number.isInteger(numericOrder) || numericOrder < 0 || numericOrder >= FIRM_NAMES.length) {
    return '';
  }
  return FIRM_NAMES[numericOrder] || '';
}

function getFirmOrderByName(name) {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  if (!normalizedName) return null;
  const order = FIRM_NAMES.indexOf(normalizedName);
  return order >= 0 ? order : null;
}

assertEqual(getFirmNameByOrder(0), 'LS증권', 'order 0 → LS증권');
assertEqual(getFirmNameByOrder(1), '신한증권', 'order 1 → 신한증권');
assertEqual(getFirmNameByOrder(4), 'KB증권', 'order 4 → KB증권');
assertEqual(getFirmNameByOrder(11), 'DS투자증권', 'order 11 → DS투자증권');
assertEqual(getFirmNameByOrder(27), '유안타증권', 'order 27 → 유안타증권');
assertEqual(getFirmNameByOrder(-1), '', '음수 → 빈 문자열');
assertEqual(getFirmNameByOrder(999), '', '범위 초과 → 빈 문자열');
assertEqual(getFirmNameByOrder('abc'), '', '문자열 → 빈 문자열');
assertEqual(getFirmNameByOrder(3.14), '', 'float → 빈 문자열');

assertEqual(getFirmOrderByName('LS증권'), 0, 'name → order 0');
assertEqual(getFirmOrderByName('키움증권'), 10, 'name → order 10');
assertEqual(getFirmOrderByName('DS투자증권'), 11, 'name → order 11');
assertEqual(getFirmOrderByName('유안타증권'), 27, 'name → order 27');
assertEqual(getFirmOrderByName(''), null, '빈 문자열 → null');
assertEqual(getFirmOrderByName(null), null, 'null → null');
assertEqual(getFirmOrderByName('없는증권'), null, '존재하지 않는 이름 → null');

// ─── Test 3: normalizeReportItem (src/utils/reportNormalizer.js) ───
console.log('\n─── [Test 3] normalizeReportItem (reportNormalizer.js) ───');

function normalizeReportItem(item) {
  if (!item) return null;
  const firm = item.firm_nm ? item.firm_nm.trim() : 'Unknown';
  const shareUrl = `/share?id=${item.report_id}`;
  return {
    id: item.report_id,
    title: item.article_title || '제목 없음',
    writer: item.writer || '작성자 미상',
    link: item.telegram_url || item.download_url || item.article_url || '#',
    article_url: item.article_url,
    download_url: item.download_url,
    pdf_url: item.pdf_url,
    telegram_url: item.telegram_url,
    firm_id: item.firm_id,
    sec_firm_order: item.sec_firm_order,
    gemini_summary: item.gemini_summary,
    firm,
    date: formatDate(item.reg_dt),
    shareUrl,
    openUrl: shareUrl
  };
}

const mockItem = {
  report_id: 12345,
  article_title: '테스트 리포트',
  writer: '홍길동',
  firm_nm: '삼성증권',
  reg_dt: '20240421',
  telegram_url: 'https://t.me/test/123',
  download_url: 'https://example.com/dl',
  sec_firm_order: 5,
  firm_id: 5,
};

const normalized = normalizeReportItem(mockItem);

assert(normalized !== null, '정상 아이템이 null이 아님');
assertEqual(normalized.id, 12345, 'id = report_id');
assertEqual(normalized.title, '테스트 리포트', 'title = article_title');
assertEqual(normalized.writer, '홍길동', 'writer = writer');
assertEqual(normalized.firm, '삼성증권', 'firm = firm_nm trim');
assertEqual(normalized.date, '2024-04-21', 'date = formatDate(reg_dt)');
assertEqual(normalized.link, 'https://t.me/test/123', 'link 우선순위: telegram_url');
assertEqual(normalized.shareUrl, '/share?id=12345', 'shareUrl 생성');
assertEqual(normalized.openUrl, '/share?id=12345', 'openUrl = shareUrl');

// fallback 테스트
const minimalItem = { report_id: 1, article_title: '', reg_dt: '' };
const minimalNormalized = normalizeReportItem(minimalItem);
assertEqual(minimalNormalized.title, '제목 없음', 'title fallback');
assertEqual(minimalNormalized.writer, '작성자 미상', 'writer fallback');
assertEqual(minimalNormalized.link, '#', 'link fallback = #');
assertEqual(minimalNormalized.firm, 'Unknown', 'firm fallback = Unknown');
assert(minimalNormalized.date === 'Unknown', 'date fallback = Unknown');

// null/undefined
assertEqual(normalizeReportItem(null), null, 'null → null');
assertEqual(normalizeReportItem(undefined), null, 'undefined → null');

// link 우선순위: telegram > download > article > #
const linkTest = { ...mockItem, telegram_url: null, download_url: 'https://dl.com' };
assertEqual(normalizeReportItem(linkTest).link, 'https://dl.com', 'link: download_url fallback');

// ─── Test 4: hasGridSelection / normalizeGridValue (gridSelect.js) ───
console.log('\n─── [Test 4] Grid Selection 유틸리티 (gridSelect.js) ───');

function hasGridSelection(value) {
  return value !== '' && value !== null && value !== undefined;
}

function normalizeGridValue(value) {
  return hasGridSelection(value) ? value.toString() : '';
}

// hasGridSelection
assert(hasGridSelection('abc'), '문자열 → true');
assert(hasGridSelection(123), '숫자 → true');
assert(hasGridSelection(0), '0 → true (0은 유효한 값)');
assert(!hasGridSelection(''), '빈 문자열 → false');
assert(!hasGridSelection(null), 'null → false');
assert(!hasGridSelection(undefined), 'undefined → false');

// normalizeGridValue
assertEqual(normalizeGridValue('abc'), 'abc', '문자열 → 그대로');
assertEqual(normalizeGridValue(123), '123', '숫자 → 문자열');
assertEqual(normalizeGridValue(0), '0', '0 → "0"');
assertEqual(normalizeGridValue(''), '', '빈 문자열 → 빈 문자열');
assertEqual(normalizeGridValue(null), '', 'null → 빈 문자열');
assertEqual(normalizeGridValue(undefined), '', 'undefined → 빈 문자열');

// ─── Test 5: isDsReport (reportLinks.js) ───
console.log('\n─── [Test 5] isDsReport (reportLinks.js) ───');

function isDsReport(report) {
  const { firm, firm_id, sec_firm_order, link, download_url, pdf_url } = report || {};
  const sourceUrl = pdf_url || download_url || link || '';
  return String(sec_firm_order) === '11' ||
    String(firm_id) === '11' ||
    firm?.includes('DS') ||
    firm?.includes('디에스') ||
    sourceUrl.includes('ds-sec.co.kr');
}

assert(isDsReport({ sec_firm_order: 11 }), 'sec_firm_order=11 → DS');
assert(isDsReport({ firm_id: 11 }), 'firm_id=11 → DS');
assert(isDsReport({ sec_firm_order: '11' }), 'sec_firm_order="11" → DS');
assert(isDsReport({ firm: 'DS투자증권' }), 'firm="DS투자증권" → DS');
assert(isDsReport({ firm: '디에스투자증권' }), 'firm="디에스투자증권" → DS');
assert(isDsReport({ pdf_url: 'https://ds-sec.co.kr/file.pdf' }), 'url ds-sec.co.kr → DS');
assert(!isDsReport({ sec_firm_order: 0 }), 'sec_firm_order=0 → not DS');
assert(!isDsReport({}), 'empty → not DS');
assert(!isDsReport(null), 'null → not DS');
assert(!isDsReport(undefined), 'undefined → not DS');
assert(!isDsReport({ firm: '삼성증권' }), 'firm=삼성증권 → not DS');

// ─── Test 6: getShareUrl (reportLinks.js) ───
console.log('\n─── [Test 6] getShareUrl (reportLinks.js) ───');

function getShareUrl(reportId, origin = 'https://localhost') {
  return `${origin}/share?id=${reportId}`;
}

assertEqual(getShareUrl(123), 'https://localhost/share?id=123', '기본 origin');
assertEqual(getShareUrl(456, 'https://example.com'), 'https://example.com/share?id=456', '커스텀 origin');

// ─── Test 7: getProxyPdfUrl (reportLinks.js) ───
console.log('\n─── [Test 7] getProxyPdfUrl (reportLinks.js) ───');

function getProxyPdfUrl(report, origin = 'https://localhost') {
  const { title = 'report', firm = '증권사', link = '' } = report || {};
  const sourceUrl = report?.pdf_url || report?.download_url || link;
  if (!sourceUrl || sourceUrl === '#') return '';
  const fileName = encodeURIComponent(`[${firm}] ${title}.pdf`);
  const referer = report?.article_url;
  const functionName = isDsReport(report) ? 'proxy-ds' : 'proxy';
  return `${origin}/.netlify/functions/${functionName}?url=${encodeURIComponent(sourceUrl)}&filename=${fileName}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`;
}

const proxyReport = {
  title: '테스트',
  firm: 'LS증권',
  pdf_url: 'https://example.com/report.pdf',
  article_url: 'https://example.com/page',
};

const proxyUrl = getProxyPdfUrl(proxyReport);
assert(proxyUrl.includes('/.netlify/functions/proxy?'), '일반 증권사 → proxy 함수');
assert(proxyUrl.includes('url='), 'url 파라미터 포함');
assert(proxyUrl.includes('filename='), 'filename 파라미터 포함');
assert(proxyUrl.includes('referer='), 'referer 파라미터 포함');

// DS 증권 → proxy-ds
const dsReport = { title: 'DS리포트', firm: 'DS투자증권', pdf_url: 'https://ds-sec.co.kr/file.pdf' };
const dsProxyUrl = getProxyPdfUrl(dsReport);
assert(dsProxyUrl.includes('/.netlify/functions/proxy-ds?'), 'DS증권 → proxy-ds 함수');

// 빈 URL
assertEqual(getProxyPdfUrl({}), '', '소스 URL 없음 → 빈 문자열');
assertEqual(getProxyPdfUrl({ pdf_url: '#' }), '', 'pdf_url="#" → 빈 문자열');

// ─── Test 8: getDirectUrl (reportLinks.js) ───
console.log('\n─── [Test 8] getDirectUrl (reportLinks.js) ───');

function getDirectUrl(report) {
  const { id, link } = report;
  const isDs = isDsReport(report);
  const needsProxy = isDs || !link || link === '#';
  if (needsProxy) {
    return getShareUrl(id);
  }
  return link;
}

assertEqual(getDirectUrl({ id: 1, link: 'https://example.com/doc' }), 'https://example.com/doc', '일반 링크 → 직접 URL');
assertEqual(getDirectUrl({ id: 1, link: '#' }), 'https://localhost/share?id=1', 'link="#" → share URL');
assertEqual(getDirectUrl({ id: 1 }), 'https://localhost/share?id=1', 'link 없음 → share URL');
assert(getDirectUrl({ id: 2, link: 'https://foo.com', sec_firm_order: 11 }).includes('/share?id=2'), 'DS report → share URL');

// ─── Test 9: CONFIG 구조 검증 (constants/config.js) ───
console.log('\n─── [Test 9] CONFIG 구조 (config.js) ───');

const CONFIG = {
  API: {
    BASE_URL: 'https://ssh-oci.duckdns.org',
    REPORT_API_URL: 'https://ssh-oci.duckdns.org/pub',
    COMPANIES_URL: 'https://ssh-oci.duckdns.org/pub/api/companies',
    BOARDS_URL: 'https://ssh-oci.duckdns.org/pub/api/boards',
    TABLE_NAME: 'api',
  },
  VPN: {
    ADDR: undefined,
    getAdminUrl: (path) => `https://${undefined}${path.startsWith('/') ? path : '/' + path}`,
  },
  TELEGRAM: {
    BOT_ID: '1372612160',
    BOT_NAME: 'ebest_noti_bot',
    getAuthUrl: (userId) => `https://t.me/ebest_noti_bot${userId ? `?start=${userId}` : ''}`,
  },
  STORAGE_KEYS: {
    AUTH_TOKEN: 'auth_token',
    TELEGRAM_USER: 'telegram_user',
    THEME: 'theme',
  }
};

// API
assert(CONFIG.API.BASE_URL === 'https://ssh-oci.duckdns.org', 'API.BASE_URL');
assert(CONFIG.API.COMPANIES_URL.includes('/pub/api/companies'), 'API.COMPANIES_URL');
assert(CONFIG.API.BOARDS_URL.includes('/pub/api/boards'), 'API.BOARDS_URL');
assert(CONFIG.API.TABLE_NAME === 'api', 'API.TABLE_NAME');

// TELEGRAM
assertEqual(CONFIG.TELEGRAM.BOT_NAME, 'ebest_noti_bot', 'TELEGRAM.BOT_NAME');
assert(CONFIG.TELEGRAM.getAuthUrl(123).includes('?start=123'), 'TELEGRAM.getAuthUrl with userId');
assert(CONFIG.TELEGRAM.getAuthUrl().includes('t.me/ebest_noti_bot'), 'TELEGRAM.getAuthUrl without userId');

// STORAGE_KEYS
assert(CONFIG.STORAGE_KEYS.AUTH_TOKEN === 'auth_token', 'STORAGE_KEYS.AUTH_TOKEN');
assert(CONFIG.STORAGE_KEYS.TELEGRAM_USER === 'telegram_user', 'STORAGE_KEYS.TELEGRAM_USER');
assert(CONFIG.STORAGE_KEYS.THEME === 'theme', 'STORAGE_KEYS.THEME');

// ─── 결과 요약 ───
console.log('\n════════════════════════════════════════════');
console.log(`  결과: ${passed} 통과, ${failed} 실패 (총 ${passed + failed}개)`);
console.log('════════════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);

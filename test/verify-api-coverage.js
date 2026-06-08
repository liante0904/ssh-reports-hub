#!/usr/bin/env node
/**
 * API 커버리지 검증기
 *
 * 규칙: src/ 안에서 request() 또는 fetch()로 API를 호출하면
 *       1) API_REFERENCE.md 에 문서화되어 있어야 함
 *       2) test/ 디렉토리에 해당 엔드포인트 테스트가 있어야 함
 *
 * 위반 시 CI 실패. 어떤 LLM이 와도 이 규칙을 우회할 수 없음.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC_DIR = resolve(ROOT, 'src');
const DOC_FILE = resolve(ROOT, 'API_REFERENCE.md');
const TEST_DIR = resolve(ROOT, 'test');

// ─── 1. src/ 안의 모든 API 호출 수집 ───
function collectFiles(dir, exts = ['.js', '.jsx']) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...collectFiles(full, exts));
    } else if (entry.isFile() && exts.some(e => full.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function extractApiCalls(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const calls = [];

  // request('...') 또는 request(`...`) 패턴
  const requestRe = /request\s*\(\s*(['"`])([^'"`]+?)\1/g;
  let m;
  while ((m = requestRe.exec(content)) !== null) {
    const urlExpr = m[2];
    if (urlExpr.includes('http') || urlExpr.includes('CONFIG') || urlExpr.includes('build')) {
      calls.push({ file: filePath, url: urlExpr, line: lineNumber(content, m.index) });
    }
  }

  // fetch('...') 또는 fetch(`...`) 패턴
  const fetchRe = /fetch\s*\(\s*((?:['"`])[^'"`]+?\2)/g;
  while ((m = fetchRe.exec(content)) !== null) {
    const urlExpr = m[1].slice(1, -1); // 따옴표 제거
    if (urlExpr.includes('http') || urlExpr.includes('CONFIG') || urlExpr.includes('.netlify/functions') || urlExpr.includes('build')) {
      calls.push({ file: filePath, url: urlExpr, line: lineNumber(content, m.index) });
    }
  }

  return calls;
}

function lineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

// ─── 2. 실제 엔드포인트로 정규화 ───
function normalizeEndpoint(call) {
  const u = call.url;

  // FastAPI 엔드포인트
  if (u.includes('/industry')) {
    return { path: '/external/api/industry', method: 'GET', note: '산업 리포트 조회' };
  }
  if (u.includes('/api/fnguide/report-summaries')) {
    return { path: '/api/fnguide/report-summaries', method: 'GET', note: 'FnGuide 종목요약 조회' };
  }
  if (u.includes('REPORT_API_URL') || u.includes('buildApiUrl()') || u.includes('buildReportFetchUrl')) {
    return { path: '/external/api/search', method: 'GET', note: '리포트 검색 (reportFetch)' };
  }
  if (u.includes('BOARDS_URL')) {
    return { path: '/external/api/boards', method: 'GET', note: '게시판 목록' };
  }
  if (u.includes('/external/auth/telegram')) {
    return { path: '/external/auth/telegram', method: 'POST', note: '텔레그램 인증' };
  }
  if (u.includes('/keywords/sync')) {
    return { path: '/keywords/sync', method: 'POST', note: '키워드 동기화' };
  }
  if (u.includes('/keywords')) {
    return { path: '/keywords', method: 'GET', note: '키워드 조회' };
  }
  if (u.match(/\/favorites\/\$\{/)) {
    return { path: '/favorites/{id}', method: 'POST/DELETE', note: '즐겨찾기 토글' };
  }
  if (u.includes('/favorites')) {
    return { path: '/favorites', method: 'GET', note: '즐겨찾기 목록' };
  }
  if (u.includes('/admin/reports/') && u.includes('summarize')) {
    return { path: '/admin/reports/{id}/summarize', method: 'POST', note: 'AI 요약 생성' };
  }
  if (u.includes('/reports/send-history')) {
    return { path: '/external/api/reports/send-history', method: 'GET', note: '텔레그램 발송 내역' };
  }
  if (u.includes('/admin/logs/view')) {
    return { path: '/admin/logs/view', method: 'GET', note: '로그 파일 보기' };
  }
  if (u.includes('/admin/logs')) {
    return { path: '/admin/logs', method: 'GET', note: '로그 디렉토리' };
  }
  if (u.includes('/admin/metrics')) {
    return { path: '/admin/metrics', method: 'GET', note: '시스템 메트릭' };
  }
  if (u.includes('/health')) {
    return { path: '/health', method: 'GET', note: '헬스 체크' };
  }

  // Netlify Functions
  if (u.includes('.netlify/functions/proxy-ds')) {
    return { path: '/.netlify/functions/proxy-ds', method: 'GET', note: 'DS PDF 프록시' };
  }
  if (u.includes('.netlify/functions/proxy')) {
    return { path: '/.netlify/functions/proxy', method: 'GET', note: 'PDF 프록시' };
  }
  if (u.includes('.netlify/functions/share')) {
    return { path: '/.netlify/functions/share', method: 'GET', note: '공유 페이지' };
  }

  // 외부 서비스
  if (u.includes('t.me/')) {
    return null; // 외부 서비스는 제외
  }
  if (u.includes('sharer.kakao.com')) {
    return null; // 외부 서비스는 제외
  }

  // Warmup 전용 HEAD 요청도 skip
  if (u.includes('warmup=true')) {
    return null;
  }

  return null; // 알 수 없는 엔드포인트 → 경고
}

// ─── 3. API_REFERENCE.md 에서 문서화된 엔드포인트 추출 ───
function extractDocEndpoints() {
  const content = readFileSync(DOC_FILE, 'utf-8');
  const endpoints = new Set();

  const re = /(?:GET|POST|PUT|DELETE|HEAD|PATCH)\s+(?:\{BASE\}\/)?(\S+)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    endpoints.add(m[1].replace(/\/$/, ''));
  }
  return endpoints;
}

// ─── 4. test/ 디렉토리에서 테스트된 엔드포인트 추출 ───
function collectTestFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTestFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      results.push(full);
    }
  }
  return results;
}

function extractTestEndpoints() {
  const testFiles = collectTestFiles(TEST_DIR);
  const endpoints = new Set();

  for (const file of testFiles) {
    const content = readFileSync(file, 'utf-8');

    // 1) 일반 문자열 URL: '/external/api/...'  "https://..."
    const strRe = /['"](https?:\/\/[^'"\s]+|\/[a-zA-Z][^'"\s]*api[^'"\s]*|(?:\/[a-zA-Z][^'"\s]*){2,})['"]/g;
    let m;
    while ((m = strRe.exec(content)) !== null) {
      const url = m[1];
      if (isApiUrl(url)) endpoints.add(url);
    }

    // 2) 템플릿 리터럴: `.../${BASE_URL}/external/api/boards?...`
    //    주요 API 경로 패턴을 직접 찾음
    const pathPatterns = [
      /\/external\/api\/search/g,
      /\/external\/api\/industry/g,
      /\/api\/fnguide\/report-summaries/g,
      /\/external\/api\/companies/g,
      /\/external\/api\/boards/g,
      /\/external\/auth\/telegram/g,
      /\/keywords\/sync/g,
      /\/keywords\b/g,
      /\/favorites\//g,
      /\/favorites\b/g,
      /\/admin\/metrics/g,
      /\/admin\/logs\/view/g,
      /\/admin\/logs\b/g,
      /\/admin\/reports\/[^/\s]+\/summarize/g,
      /\/health\b/g,
      /\/\.netlify\/functions\/proxy-ds/g,
      /\/\.netlify\/functions\/proxy\b/g,
      /\/\.netlify\/functions\/share\b/g,
    ];

    for (const pattern of pathPatterns) {
      let pm;
      while ((pm = pattern.exec(content)) !== null) {
        endpoints.add(pm[0]);
      }
    }
  }
  return endpoints;
}

function isApiUrl(url) {
  return url.includes('external/api') || url.includes('/admin/') ||
         url.includes('/health') ||
         url.includes('/api/fnguide/') ||
         url.includes('.netlify/functions/') || url.includes('/keywords') ||
         url.includes('/favorites') || url.includes('/share');
}

// ─── 5. 검증 실행 ───
console.log('═══════════════════════════════════════');
console.log('  API 커버리지 검증');
console.log('═══════════════════════════════════════\n');

const files = collectFiles(SRC_DIR);
const allCalls = [];
for (const file of files) {
  allCalls.push(...extractApiCalls(file));
}

const docEndpoints = extractDocEndpoints();
const testEndpoints = extractTestEndpoints();

const undocumented = [];
const untested = [];

for (const call of allCalls) {
  const ep = normalizeEndpoint(call);
  if (!ep) continue; // 외부 서비스 등 skip

  // 문서화 체크
  let docFound = false;
  for (const docEp of docEndpoints) {
    if (docEp.includes(ep.path.replace(/^\/external\/api/, '').replace(/^\//, '')) ||
        ep.path.includes(docEp) ||
        docEp.includes(ep.path.replace(/^\//, ''))) {
      docFound = true;
      break;
    }
  }
  // 간소화: path 자체가 docEndpoints에 있는지
  const normalizedPath = ep.path.replace(/^\/external\/api/, '/external/api');
  const docMatch = [...docEndpoints].some(d => 
    normalizedPath.includes(d.replace(/\/\{[^}]+\}/g, '')) ||
    d.includes(normalizedPath.replace(/\/\{[^}]+\}/g, ''))
  );
  
  if (!docMatch && !docFound) {
    undocumented.push({ ...ep, file: call.file, line: call.line });
  }

  // 테스트 체크
  const testMatch = [...testEndpoints].some(t => {
    const cleanPath = ep.path.replace(/^\/external\/api/, '/external/api').replace(/\/\{[^}]+\}/g, '');
    return t.includes(cleanPath.split('?')[0]);
  });

  if (!testMatch) {
    untested.push({ ...ep, file: call.file, line: call.line });
  }
}

// ─── 결과 출력 ───
let exitCode = 0;

if (undocumented.length > 0) {
  console.log('❌ API_REFERENCE.md 에 없는 API 호출 발견:');
  for (const u of undocumented) {
    console.log(`   ${u.file}:${u.line}  →  ${u.method} ${u.path}`);
  }
  console.log('');
  exitCode = 1;
} else {
  console.log('✅ 모든 API 호출이 API_REFERENCE.md 에 문서화됨');
}

if (untested.length > 0) {
  console.log('❌ 테스트 파일에 없는 API 호출 발견:');
  for (const u of untested) {
    console.log(`   ${u.file}:${u.line}  →  ${u.method} ${u.path} (테스트 누락)`);
  }
  console.log('');
  exitCode = 1;
} else {
  console.log('✅ 모든 API 호출이 테스트 파일에 존재');
}

console.log(`\n결과: ${exitCode === 0 ? '통과 ✅' : '실패 ❌'}\n`);
process.exit(exitCode);

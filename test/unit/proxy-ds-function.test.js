/**
 * proxy-ds Netlify function tests with mocked fetch.
 *
 * Usage:
 *   node test/unit/proxy-ds-function.test.js
 */

import { handler } from '../../netlify/functions/proxy-ds.js';

let passed = 0;
let failed = 0;

function assert(condition, label, detail = '') {
  if (condition) {
    console.log(`  PASS: ${label}${detail ? ` (${detail})` : ''}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}${detail ? ` (${detail})` : ''}`);
    failed++;
  }
}

function makeEvent({ method = 'GET', query = {} } = {}) {
  return {
    httpMethod: method,
    queryStringParameters: query,
  };
}

function makeResponse({ status = 200, headers = {}, body = '' } = {}) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key) => normalizedHeaders.get(key.toLowerCase()) || null,
      getSetCookie: () => {
        const setCookie = normalizedHeaders.get('set-cookie');
        return setCookie ? [setCookie] : [];
      },
    },
    arrayBuffer: async () => {
      if (Buffer.isBuffer(body)) return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
      return Buffer.from(body).buffer;
    },
  };
}

async function runWithMockedFetch(mockFetch, testFn) {
  const originalFetch = global.fetch;
  global.fetch = mockFetch;
  try {
    await testFn();
  } finally {
    global.fetch = originalFetch;
  }
}

console.log('\n--- proxy-ds.js handler ---');

{
  const res = await handler(makeEvent({ method: 'OPTIONS' }));
  assert(res.statusCode === 204, 'OPTIONS returns 204');
  assert(res.headers['Access-Control-Allow-Methods'].includes('GET'), 'OPTIONS exposes GET');
}

{
  const res = await handler(makeEvent({ method: 'GET' }));
  assert(res.statusCode === 400, 'missing URL returns 400');
  assert(res.body === 'URL missing', 'missing URL message');
}

{
  const res = await handler(makeEvent({
    method: 'GET',
    query: { url: encodeURIComponent('https://example.com/file.pdf') },
  }));
  assert(res.statusCode === 400, 'non-DS URL is rejected');
}

{
  const res = await handler(makeEvent({
    method: 'HEAD',
    query: { url: encodeURIComponent('https://www.ds-sec.co.kr/bbs/download.php?wr_id=1&no=0') },
  }));
  assert(res.statusCode === 200, 'DS HEAD returns 200');
  assert(res.headers['Content-Type'] === 'application/pdf', 'DS HEAD advertises PDF');
}

await runWithMockedFetch(async (url) => {
  if (String(url).includes('board.php')) {
    return makeResponse({
      headers: {
        'set-cookie': 'PHPSESSID=test-session; path=/',
      },
      body: '<html>board</html>',
    });
  }

  return makeResponse({
    headers: {
      'content-type': 'file/unknown',
    },
    body: Buffer.from('%PDF-1.7\nmock pdf body'),
  });
}, async () => {
  const res = await handler(makeEvent({
    method: 'GET',
    query: {
      url: encodeURIComponent('https://www.ds-sec.co.kr/bbs/download.php?bo_table=sub03_03&wr_id=2055&no=0'),
      referer: encodeURIComponent('https://www.ds-sec.co.kr/bbs/board.php?bo_table=sub03_03&wr_id=2055&page=1'),
      filename: encodeURIComponent('[DS] test.pdf'),
    },
  }));

  assert(res.statusCode === 200, 'mocked DS PDF returns 200');
  assert(res.headers['Content-Type'] === 'application/pdf', 'mocked DS PDF is served as application/pdf');
  assert(res.isBase64Encoded === true, 'mocked DS PDF is base64 encoded');
  assert(Buffer.from(res.body, 'base64').subarray(0, 4).toString('ascii') === '%PDF', 'mocked body is PDF');
});

await runWithMockedFetch(async (url) => {
  if (String(url).includes('board.php')) {
    return makeResponse({
      headers: { 'set-cookie': 'PHPSESSID=test-session; path=/' },
      body: '<html>board</html>',
    });
  }

  return makeResponse({
    headers: { 'content-type': 'text/html; charset=utf-8' },
    body: '<html>blocked</html>',
  });
}, async () => {
  const res = await handler(makeEvent({
    method: 'GET',
    query: {
      url: encodeURIComponent('https://www.ds-sec.co.kr/bbs/download.php?bo_table=sub03_03&wr_id=2055&no=0'),
      referer: encodeURIComponent('https://www.ds-sec.co.kr/bbs/board.php?bo_table=sub03_03&wr_id=2055&page=1'),
    },
  }));

  assert(res.statusCode === 502, 'HTML from DS is treated as proxy failure');
  assert(res.headers['Content-Type'].startsWith('text/plain'), 'HTML failure is returned as plain text');
});

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

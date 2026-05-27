const FETCH_TIMEOUT_MS = 12000;
const COOKIE_TTL_MS = 20 * 60 * 1000;
const cookieCache = new Map();

function timeoutSignal(ms = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

async function fetchWithTimeout(url, options = {}, ms = FETCH_TIMEOUT_MS) {
  const { signal, clear } = timeoutSignal(ms);
  try {
    return await fetch(url, { ...options, signal });
  } finally {
    clear();
  }
}

function decodeParam(value = '') {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getCookieHeader(res) {
  if (res.headers.getSetCookie) {
    return res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  }

  const fallbackCookie = res.headers.get('set-cookie');
  return fallbackCookie ? fallbackCookie.split(/,(?=[^;]+?=)/).map(c => c.split(';')[0]).join('; ') : '';
}

function buildBoardUrl(targetUrl, referer) {
  if (referer) return decodeParam(referer);

  try {
    const parsed = new URL(targetUrl);
    if (/\/bbs\/download\.php$/i.test(parsed.pathname)) {
      parsed.pathname = parsed.pathname.replace(/download\.php$/i, 'board.php');
      parsed.searchParams.delete('no');
      return parsed.toString();
    }
  } catch {
    // 아래 fallback 사용
  }

  return targetUrl.replace('download.php', 'board.php');
}

function isLikelyPdf(buffer) {
  return buffer.length > 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF';
}

async function getPrimedCookies(boardUrl, headers) {
  const cached = cookieCache.get(boardUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.cookies;
  }

  const boardRes = await fetchWithTimeout(boardUrl, { headers, redirect: 'follow' });
  const cookies = getCookieHeader(boardRes);

  if (cookies) {
    cookieCache.set(boardUrl, {
      cookies,
      expiresAt: Date.now() + COOKIE_TTL_MS,
    });
  }

  return cookies;
}

function createHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8',
    'Accept-Language': 'ko,en-US;q=0.9,en;q=0.8',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Upgrade-Insecure-Requests': '1',
    'Connection': 'keep-alive',
  };
}

export const handler = async (event) => {
  const { url, filename, referer, warmup } = event.queryStringParameters || {};
  const isHead = event.httpMethod === 'HEAD';
  const isOptions = event.httpMethod === 'OPTIONS';

  if (isOptions) {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
        'Cache-Control': 'no-store',
      },
      body: '',
    };
  }

  if (warmup) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      body: 'Warmed up',
    };
  }

  if (!url) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      body: 'URL missing',
    };
  }

  const targetUrl = decodeParam(url);
  const boardUrl = buildBoardUrl(targetUrl, referer);

  try {
    const targetHost = new URL(targetUrl).hostname;
    if (!/(^|\.)ds-sec\.co\.kr$/i.test(targetHost)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        body: 'proxy-ds only supports ds-sec.co.kr URLs',
      };
    }

    if (isHead) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Expose-Headers': 'Content-Length, Content-Type',
          'Cache-Control': 'public, max-age=3600',
        },
        body: '',
      };
    }

    const baseHeaders = createHeaders();
    let cookies = '';
    try {
      cookies = await getPrimedCookies(boardUrl, baseHeaders);
    } catch (err) {
      console.error('[Proxy-DS] Cookie fetch error:', err);
    }

    const res = await fetchWithTimeout(targetUrl, {
      headers: {
        ...baseHeaders,
        'Referer': boardUrl,
        ...(cookies ? { 'Cookie': cookies } : {}),
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        body: `DS server responded with ${res.status}`,
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || '';

    if (!isLikelyPdf(buffer) && (contentType.includes('text/html') || buffer.length < 5000)) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        body: 'DS PDF fetch returned non-PDF content',
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename || 'report.pdf')}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Type',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error('[Proxy-DS] Exception:', e);
    const isTimeout = e.name === 'AbortError';
    return {
      statusCode: isTimeout ? 504 : 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      body: isTimeout ? 'DS PDF 서버 응답이 지연되어 요청을 중단했습니다.' : e.message,
    };
  }
};

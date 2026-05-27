const FETCH_TIMEOUT_MS = 8000;
const DS_COOKIE_TTL_MS = 20 * 60 * 1000;
const dsCookieCache = new Map();

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

function getCookieHeader(res) {
  if (res.headers.getSetCookie) {
    return res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  }

  const fallbackCookie = res.headers.get('set-cookie');
  return fallbackCookie ? fallbackCookie.split(/,(?=[^;]+?=)/).map(c => c.split(';')[0]).join('; ') : '';
}

async function getPrimedCookies(boardUrl, headers, isDs) {
  if (isDs) {
    const cached = dsCookieCache.get(boardUrl);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.cookies;
    }
  }

  const boardRes = await fetchWithTimeout(boardUrl, { headers, redirect: 'follow' });
  const cookies = getCookieHeader(boardRes);

  if (isDs && cookies) {
    dsCookieCache.set(boardUrl, {
      cookies,
      expiresAt: Date.now() + DS_COOKIE_TTL_MS,
    });
  }

  return cookies;
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
  
  // 1. 워밍업 요청 대응
  if (warmup) {
    return { 
      statusCode: 200, 
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
      body: 'Warmed up' 
    };
  }

  if (!url) return { statusCode: 400, body: 'URL missing' };

  const targetUrl = decodeURIComponent(url);
  const boardUrl = referer ? decodeURIComponent(referer) : targetUrl.replace('download.php', 'board.php');

  try {
    const targetHost = new URL(targetUrl).hostname;
    const isDs = /(^|\.)ds-sec\.co\.kr$/i.test(targetHost);

    if (isHead && isDs) {
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

    const baseHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
      'Accept': isDs ? 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8' : 'application/pdf,application/octet-stream,*/*',
      'Accept-Language': 'ko,en-US;q=0.9,en;q=0.8',
      'Connection': 'keep-alive',
      ...(isDs ? {
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Upgrade-Insecure-Requests': '1',
      } : {}),
    };

    let cookies = '';
    const shouldPrimeCookies = Boolean(referer) || isDs || /download\.php/i.test(targetUrl);
    if (shouldPrimeCookies) {
      try {
        cookies = await getPrimedCookies(boardUrl, baseHeaders, isDs);
      } catch (err) {
        console.error('[Proxy] Cookie fetch error:', err);
      }
    }

    const dlHeaders = {
      ...baseHeaders,
      'Referer': boardUrl,
      ...(cookies ? { 'Cookie': cookies } : {}),
    };
    
    // 타겟 서버 요청 (HEAD인 경우 HEAD로, 아니면 GET으로)
    const res = await fetchWithTimeout(targetUrl, { 
      headers: dlHeaders, 
      redirect: 'follow',
      method: isHead ? 'HEAD' : 'GET'
    }, isHead ? 5000 : FETCH_TIMEOUT_MS);

    const contentType = res.headers.get('content-type') || '';
    
    // HEAD 요청에 대한 빠른 응답
    if (isHead) {
      return {
        statusCode: res.status,
        headers: {
          'Content-Type': contentType,
          'Content-Length': res.headers.get('content-length') || '0',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store'
        },
        body: ''
      };
    }

    if (!res.ok) {
      throw new Error(`Target server responded with ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 에러 케이스 (HTML이 오거나 너무 작은 파일)
    if (contentType.includes('text/html') || buffer.length < 5000) {
      return { 
        statusCode: 502, 
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        body: `<h3>PDF를 불러올 수 없습니다. (콘텐츠 오류)</h3>` 
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
    console.error('[Proxy] Exception:', e);
    const isTimeout = e.name === 'AbortError';
    return {
      statusCode: isTimeout ? 504 : 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      body: isTimeout ? 'PDF 서버 응답이 지연되어 요청을 중단했습니다.' : e.message,
    };
  }
};

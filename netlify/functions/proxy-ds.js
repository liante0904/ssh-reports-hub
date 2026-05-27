const FETCH_TIMEOUT_MS = 15000;
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

function buildBoardUrl(targetUrl, referer) {
  if (referer) {
    let resolved = decodeParam(referer);
    // 상대 경로(예: ../bbs/board.php?...)를 targetUrl 기준 절대 URL로 변환
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

  try {
    const parsedBoard = new URL(boardUrl);
    const mainUrl = `${parsedBoard.protocol}//${parsedBoard.hostname}/`;

    // 1단계: 메인 페이지 방문 → 기본 세션 쿠키 획득 (PHPSESSID, 2a0d...)
    const mainRes = await fetchWithTimeout(mainUrl, { headers, redirect: 'follow' });
    const mainCookies = getCookieHeader(mainRes);

    // 2단계: 게시판 페이지 방문 → 게시판 인증 쿠키 획득 (e1192...)
    const boardHeaders = { ...headers };
    if (mainCookies) {
      boardHeaders['Cookie'] = mainCookies;
    }
    const boardRes = await fetchWithTimeout(boardUrl, { headers: boardHeaders, redirect: 'follow' });
    const boardCookies = getCookieHeader(boardRes);

    // 두 쿠키 세트를 병합 (게시판 쿠키 우선)
    const merged = mergeCookies(mainCookies, boardCookies);

    if (merged) {
      cookieCache.set(boardUrl, {
        cookies: merged,
        expiresAt: Date.now() + COOKIE_TTL_MS,
      });
    }

    return merged || boardCookies || mainCookies;
  } catch (err) {
    console.error('[Proxy-DS] Cookie priming error:', err.message);
    return '';
  }
}

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

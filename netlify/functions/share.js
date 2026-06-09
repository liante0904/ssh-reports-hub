const FETCH_TIMEOUT_MS = 8000;
const DEFAULT_API_BASE_URL = 'https://ssh-oci.duckdns.org';
const DEFAULT_API_PATH = '/external/api';
const KNOWN_REPORT_API_PATHS = [
  '/external/api',
  '/pub/api',
];

async function fetchWithTimeout(url, options = {}, ms = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isDsReport(report, pdfUrl = '') {
  const firm = report?.firm_nm || report?.firm || '';
  const firmId = report?.firm_id ?? report?.firmId;
  const firmOrder = report?.sec_firm_order ?? report?.secFirmOrder;
  return String(firmOrder) === '11' || String(firmId) === '11' || firm.includes('DS') || firm.includes('디에스') || /(^|\.)ds-sec\.co\.kr/i.test(pdfUrl);
}

function trimSlashes(value = '') {
  return String(value).replace(/^\/+/, '').replace(/\/+$/, '');
}

function hasKnownReportApiPath(url) {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, '');
    return KNOWN_REPORT_API_PATHS.some(path => pathname.endsWith(path));
  } catch {
    return false;
  }
}

export function buildReportSearchUrl(reportId, env = process.env) {
  const explicitReportApiUrl = env.VITE_REPORT_API_URL;
  const apiBaseUrl = (explicitReportApiUrl || env.VITE_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');
  const apiPath = env.VITE_API_PATH || DEFAULT_API_PATH;
  const tableName = trimSlashes(env.VITE_TABLE_NAME || 'api');

  let reportApiUrl = apiBaseUrl;

  if (!hasKnownReportApiPath(reportApiUrl)) {
    if (explicitReportApiUrl || /\/pub$/i.test(reportApiUrl)) {
      reportApiUrl = `${reportApiUrl}/${tableName}`;
    } else {
      reportApiUrl = `${reportApiUrl}/${trimSlashes(apiPath)}`;
    }
  }

  return `${reportApiUrl.replace(/\/$/, '')}/search/?report_id=${encodeURIComponent(reportId)}`;
}

export const handler = async (event) => {
  const { id, warmup } = event.queryStringParameters || {};

  // 워밍업 요청 대응
  if (warmup) {
    return { statusCode: 200, body: 'Warmed up' };
  }

  const SITE_URL = 'https://ssh-oci.netlify.app';
  const requestHost = event.headers?.host || 'ssh-oci.netlify.app';
  const requestOrigin = event.headers?.origin || `https://${requestHost}`;
  const userAgent = event.headers?.['user-agent'] || event.headers?.['User-Agent'] || '';
  const isIos = /iPad|iPhone|iPod/i.test(userAgent);

  if (!id) return { statusCode: 400, body: 'ID missing' };

  // ★ 변경: 봇이 아닌 일반 사용자에게는 즉시 로딩 페이지를 반환하고,
  //   실제 데이터 처리는 비동기로 진행하여 리다이렉트
  const isBot = /kakaotalk|telegram|facebook|twitter|slack|bot|crawler|spider/i.test(userAgent);

  if (!isBot) {
    // 일반 사용자: 즉시 로딩 페이지 반환 (스켈레톤 UI + 자동 리다이렉트)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: generateLoadingPage(id, requestOrigin, SITE_URL),
    };
  }

  // 봇인 경우: 기존 로직 그대로 실행 (OG 태그 포함 HTML 반환)
  try {
    const apiUrl = buildReportSearchUrl(id);
    
    const response = await fetchWithTimeout(apiUrl);
    const responseText = await response.text();
    if (!response.ok) {
      console.error('[Share] Report API Error:', response.status, responseText.slice(0, 300));
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        body: 'Report API request failed',
      };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('[Share] Report API JSON parse error:', jsonError, responseText.slice(0, 300));
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        body: 'Report API returned non-JSON response',
      };
    }
    const report = data.items?.[0];

    if (!report) return { statusCode: 404, body: 'Report not found' };

    // 1. 원본 PDF URL 추출
    // MyAsset/유안타처럼 article_url은 상세 뷰어 페이지이고,
    // pdf_url/download_url/telegram_url이 실제 PDF 원본인 경우가 많다.
    const candidates = [
      report.pdf_url,
      report.download_url,
      report.telegram_url,
      report.key,
      report.article_url,
    ];
    let pdfUrl = candidates.find(u => u && u.startsWith('http') && !u.includes('netlify.app'));

    if (!pdfUrl) return { statusCode: 404, body: 'Original PDF link not found' };

    const pdfHost = (() => {
      try {
        return new URL(pdfUrl).hostname;
      } catch {
        return '';
      }
    })();

    // DB증권은 상세 JSON 안에 실제 게이트 토큰이 들어있는 경우가 많아서 한 번 더 해석한다.
    if (/(db-fi\.com|dbsec\.co\.kr)$/i.test(pdfHost)) {
      if (/\.json(\?|$)/i.test(pdfUrl)) {
        try {
          const jsonRes = await fetchWithTimeout(pdfUrl);
          if (jsonRes.ok) {
            const jsonData = await jsonRes.json();
            const token = jsonData?.data?.url || jsonData?.url;
            if (token) {
              pdfUrl = `https://whub.dbsec.co.kr/pv/gate?q=${token}`;
            }
          }
        } catch (e) {
          console.error('[Share] DB JSON Fetch Error:', e);
        }
      }
    }

    const title = report.article_title || '증권사 리포트';
    const company = report.firm_nm || '증권사';
    const isDs = isDsReport(report, pdfUrl);
    
    // 2. 리다이렉트 경로 결정
    let finalUrl = pdfUrl;
    const isDbsecGate = /whub\.dbsec\.co\.kr\/pv\/(gate|viewer)/i.test(pdfUrl) || /streamdocs/i.test(pdfUrl) || /(db-fi\.com|dbsec\.co\.kr)/i.test(pdfHost);

    if (isDbsecGate) {
      // DB증권 게이트웨이는 자체가 뷰어(HTML)이므로 즉시 리다이렉트
      finalUrl = pdfUrl;
    } else if (pdfUrl.startsWith('http')) {
      const fileName = `[${company}] ${title}.pdf`;
      const boardUrl = report.article_url || pdfUrl.replace('download.php', 'board.php');
      const proxyFunction = isDs ? 'proxy-ds' : 'proxy';
      const proxyUrl = `${requestOrigin}/.netlify/functions/${proxyFunction}?url=${encodeURIComponent(pdfUrl)}&filename=${encodeURIComponent(fileName)}${boardUrl ? `&referer=${encodeURIComponent(boardUrl)}` : ''}`;
      let proxyLooksGood = isDs;

      if (!isDs) {
        try {
          const proxyCheck = await fetchWithTimeout(proxyUrl, { method: 'HEAD' }, 3000);
          const proxyContentType = proxyCheck.headers.get('content-type') || '';
          proxyLooksGood = proxyCheck.ok && !proxyContentType.includes('text/html');
        } catch {
          proxyLooksGood = false;
        }
      }

      if (!proxyLooksGood) {
        finalUrl = pdfUrl;
      } else {
        const viewerBase = `${requestOrigin}/lib/pdfjs/web/viewer.html`;
        const viewerParams = `file=${encodeURIComponent(proxyUrl)}`;
        const viewerHash = 'pagemode=none&zoom=page-width';
        // iOS와 DS는 브라우저 기본 PDF 뷰어를 사용하고, 그 외는 셀프 호스팅된 pdf.js를 사용한다.
        finalUrl = isIos || isDs
          ? proxyUrl
          : `${viewerBase}?${viewerParams}#${viewerHash}`;
      }
    }

    // 3. 봇인 경우에만 OG 태그가 포함된 HTML 반환
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: `<!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <meta property="og:title" content="[${company}] ${title}" />
        <meta property="og:description" content="클릭하여 리포트를 확인하세요." />
        <meta property="og:image" content="${SITE_URL}/og-image.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script>window.location.replace("${finalUrl}");</script>
      </head><body>이동 중...</body></html>`,
    };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};

/**
 * 로딩 페이지 HTML 생성 (스켈레톤 UI + 자바스크립트로 리다이렉트)
 */
function generateLoadingPage(reportId, requestOrigin, siteUrl) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>리포트 로딩 중...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      width: 100%;
      max-width: 400px;
      text-align: center;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e0e0e0;
      border-top-color: #1976d2;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 24px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .skeleton {
      background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
      margin-bottom: 12px;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .skeleton-title { height: 24px; width: 70%; margin: 0 auto 16px; }
    .skeleton-text { height: 16px; width: 50%; margin: 0 auto 8px; }
    .skeleton-button { height: 48px; width: 100%; margin-top: 24px; }
    .loading-text {
      color: #666;
      font-size: 14px;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <div class="skeleton skeleton-title"></div>
    <div class="skeleton skeleton-text"></div>
    <div class="skeleton skeleton-text" style="width: 60%;"></div>
    <div class="skeleton skeleton-button"></div>
    <p class="loading-text">리포트를 불러오는 중입니다...</p>
  </div>
  <script>
    // 페이지 로드 후 즉시 리다이렉트 시작
    (function() {
      var id = "${reportId}";
      var origin = "${requestOrigin}";
      var apiUrl = origin + "/.netlify/functions/share-redirect?id=" + encodeURIComponent(id);
      
      // fetch로 실제 리다이렉트 URL을 받아서 이동
      fetch(apiUrl)
        .then(function(res) {
          if (res.redirected) {
            window.location.href = res.url;
          } else if (res.ok) {
            return res.text();
          } else {
            throw new Error('Failed to load report');
          }
        })
        .then(function(body) {
          // JSON 응답에서 URL 추출 시도
          try {
            var data = JSON.parse(body);
            if (data.url) {
              window.location.href = data.url;
            } else {
              document.querySelector('.loading-text').textContent = '리포트를 찾을 수 없습니다.';
            }
          } catch(e) {
            document.querySelector('.loading-text').textContent = '리포트 로딩 중 오류가 발생했습니다.';
          }
        })
        .catch(function(err) {
          document.querySelector('.loading-text').textContent = '네트워크 오류가 발생했습니다.';
          console.error('Redirect fetch error:', err);
        });
    })();
  </script>
</body>
</html>`;
}

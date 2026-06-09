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

function buildReportSearchUrl(reportId, env = process.env) {
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
  const { id } = event.queryStringParameters || {};
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'ID missing' }) };
  }

  const requestHost = event.headers?.host || 'ssh-oci.netlify.app';
  const requestOrigin = event.headers?.origin || `https://${requestHost}`;
  const userAgent = event.headers?.['user-agent'] || event.headers?.['User-Agent'] || '';
  const isIos = /iPad|iPhone|iPod/i.test(userAgent);

  try {
    const apiUrl = buildReportSearchUrl(id);
    
    const response = await fetchWithTimeout(apiUrl);
    const responseText = await response.text();
    if (!response.ok) {
      console.error('[ShareRedirect] Report API Error:', response.status, responseText.slice(0, 300));
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Report API request failed' }),
      };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('[ShareRedirect] Report API JSON parse error:', jsonError, responseText.slice(0, 300));
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Report API returned non-JSON response' }),
      };
    }
    const report = data.items?.[0];

    if (!report) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Report not found' }),
      };
    }

    // 1. 원본 PDF URL 추출
    const candidates = [
      report.pdf_url,
      report.download_url,
      report.telegram_url,
      report.key,
      report.article_url,
    ];
    let pdfUrl = candidates.find(u => u && u.startsWith('http') && !u.includes('netlify.app'));

    if (!pdfUrl) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Original PDF link not found' }),
      };
    }

    const pdfHost = (() => {
      try {
        return new URL(pdfUrl).hostname;
      } catch {
        return '';
      }
    })();

    // DB증권 처리
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
          console.error('[ShareRedirect] DB JSON Fetch Error:', e);
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
        finalUrl = isIos || isDs
          ? proxyUrl
          : `${viewerBase}?${viewerParams}#${viewerHash}`;
      }
    }

    // 3. 최종 URL을 JSON으로 반환 (클라이언트에서 리다이렉트)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({ url: finalUrl, title, company }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};

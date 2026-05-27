const FETCH_TIMEOUT_MS = 8000;

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

export const handler = async (event) => {
  const { id, warmup } = event.queryStringParameters || {};

  // 워밍업 요청 대응
  if (warmup) {
    return { statusCode: 200, body: 'Warmed up' };
  }

  const REPORT_API_URL =
    process.env.VITE_REPORT_API_URL ||
    process.env.VITE_API_URL ||
    'https://ssh-oci.duckdns.org/pub';
  const TABLE_NAME = process.env.VITE_TABLE_NAME || 'api';
  const SITE_URL = 'https://ssh-oci.netlify.app';
  const requestHost = event.headers?.host || 'ssh-oci.netlify.app';
  const requestOrigin = event.headers?.origin || `https://${requestHost}`;
  const userAgent = event.headers?.['user-agent'] || event.headers?.['User-Agent'] || '';
  const isIos = /iPad|iPhone|iPod/i.test(userAgent);

  if (!id) return { statusCode: 400, body: 'ID missing' };

  try {
    const baseUrl = REPORT_API_URL.replace(/\/$/, '');
    const tableName = TABLE_NAME.replace(/^\//, '').replace(/\/$/, '');
    const apiUrl = `${baseUrl}/${tableName}/search/?report_id=${id}`;
    
    const response = await fetchWithTimeout(apiUrl);
    const data = await response.json();
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

    // 3. 봇(카카오톡, 텔레그램 등) 여부 확인하여 분기 처리
    const isBot = /kakaotalk|telegram|facebook|twitter|slack|bot|crawler|spider/i.test(userAgent);

    if (!isBot) {
      // 일반 사용자는 302 리다이렉트로 즉시 이동 (성능 최적화)
      return {
        statusCode: 302,
        headers: {
          'Location': finalUrl,
          'Cache-Control': 'no-cache',
        },
        body: '',
      };
    }

    // 봇인 경우에만 OG 태그가 포함된 HTML 반환
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

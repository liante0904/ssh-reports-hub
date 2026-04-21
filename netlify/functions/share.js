export const handler = async (event) => {
  const { id } = event.queryStringParameters;
  const BASE_URL = process.env.VITE_ORACLE_REST_API || 'https://ssh-oci.duckdns.org/ords/admin';
  const TABLE_NAME = process.env.VITE_TABLE_NAME || 'data_main_daily_send';
  const SITE_URL = 'https://ssh-oci.netlify.app';
  const requestHost = event.headers?.host || 'ssh-oci.netlify.app';
  const requestOrigin = event.headers?.origin || `https://${requestHost}`;
  const userAgent = event.headers?.['user-agent'] || event.headers?.['User-Agent'] || '';
  const isIos = /iPad|iPhone|iPod/i.test(userAgent);

  if (!id) return { statusCode: 400, body: 'ID missing' };

  try {
    const baseUrl = BASE_URL.replace(/\/$/, '');
    const tableName = TABLE_NAME.replace(/^\//, '').replace(/\/$/, '');
    const apiUrl = `${baseUrl}/${tableName}/search/?report_id=${id}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    const report = data.items?.[0];

    if (!report) return { statusCode: 404, body: 'Report not found' };

    // 1. 진짜 원본 URL 추출 (key 또는 article_url이 가장 정확함)
    const candidates = [report.key, report.article_url, report.telegram_url, report.download_url, report.attach_url];
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
    if (/(db-fi\.com|dbsec\.co\.kr)$/i.test(pdfHost) && /\.json(\?|$)/i.test(pdfUrl)) {
      const jsonRes = await fetch(pdfUrl);
      if (jsonRes.ok) {
        const jsonData = await jsonRes.json();
        const token = jsonData?.data?.url || jsonData?.url;
        if (token) {
          pdfUrl = `https://whub.dbsec.co.kr/pv/gate?q=${token}`;
        }
      }
    }

    const title = report.article_title || '증권사 리포트';
    const company = report.firm_nm || '증권사';
    
    // 2. 리다이렉트 경로 결정
    let finalUrl = pdfUrl;
    const isDbsecGate = /whub\.dbsec\.co\.kr\/pv\/(gate|viewer)/i.test(pdfUrl) || /streamdocs/i.test(pdfUrl);

    if (isDbsecGate) {
      // DB증권은 PDF 원본이 아니라 StreamDocs 게이트/뷰어를 통해 열어야 한다.
      // pdf.js로 넘기면 HTML을 PDF로 해석하려고 해서 깨진다.
      finalUrl = pdfUrl;
    } else if (pdfUrl.startsWith('http')) {
      const fileName = `[${company}] ${title}.pdf`;
      const boardUrl = report.article_url || pdfUrl.replace('download.php', 'board.php');
      const proxyUrl = `${requestOrigin}/.netlify/functions/proxy?url=${encodeURIComponent(pdfUrl)}&filename=${encodeURIComponent(fileName)}${boardUrl ? `&referer=${encodeURIComponent(boardUrl)}` : ''}`;
      // iOS는 브라우저 기본 PDF 뷰어를 우선 사용하고, 그 외는 pdf.js로 통일한다.
      finalUrl = isIos
        ? proxyUrl
        : `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(proxyUrl)}`;
    }

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

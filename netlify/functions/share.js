export const handler = async (event) => {
  const { id } = event.queryStringParameters;
  const BASE_URL = process.env.API_BASE_URL || process.env.VITE_API_BASE_URL;
  const SITE_URL = (process.env.SITE_URL || process.env.URL || `https://${event.headers.host}`).replace(/\/+$/, '');

  if (!id) return { statusCode: 400, body: 'ID missing' };
  if (!BASE_URL) return { statusCode: 500, body: 'API_BASE_URL missing' };

  try {
    const cleanBaseUrl = BASE_URL.replace(/\/+$/, '');
    const response = await fetch(`${cleanBaseUrl}/reports/?report_id=${id}`);
    const data = await response.json();
    
    const items = Array.isArray(data) ? data : (data.items || []);
    const report = items[0];

    if (!report) return { statusCode: 404, body: 'Report not found' };

    // 1. 진짜 원본 URL 추출 (PDF_URL, TELEGRAM_URL 등)
    const candidates = [
      report.PDF_URL, report.TELEGRAM_URL, report.ATTACH_URL, report.article_url,
      report.pdf_url, report.telegram_url, report.attach_url, report.download_url, report.key
    ];
    const pdfUrl = candidates.find(u => u && u.startsWith('http') && !u.includes('netlify.app'));

    if (!pdfUrl) return { statusCode: 404, body: 'Original PDF link not found' };

    const title = report.ARTICLE_TITLE || report.article_title || '증권사 리포트';
    const company = report.FIRM_NM || report.firm_nm || '증권사';
    
    // 2. 리다이렉트 경로 결정
    let finalUrl = pdfUrl;
    if (pdfUrl.includes('ds-sec.co.kr')) {
      const fileName = `[${company}] ${title}.pdf`;
      const boardUrl = report.article_url || pdfUrl.replace('download.php', 'board.php');
      // 가장 확실한 함수 경로 사용
      finalUrl = `/.netlify/functions/proxy?url=${encodeURIComponent(pdfUrl)}&filename=${encodeURIComponent(fileName)}&referer=${encodeURIComponent(boardUrl)}`;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: `<!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <meta property="og:title" content="[${company}] ${title}" />
        <meta property="og:description" content="클릭하여 리포트를 확인하세요." />
        <meta property="og:image" content="${SITE_URL}/og-image.png" />
        <script>window.location.replace("${finalUrl}");</script>
      </head><body>이동 중...</body></html>`,
    };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};

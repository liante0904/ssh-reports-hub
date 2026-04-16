export const handler = async (event) => {
  const { id } = event.queryStringParameters;
  const BASE_URL = process.env.VITE_ORACLE_REST_API;
  const TABLE_NAME = process.env.VITE_TABLE_NAME;
  const SITE_URL = 'https://ssh-oci.netlify.app';

  if (!id) return { statusCode: 400, body: 'ID missing' };

  try {
    const response = await fetch(`${BASE_URL}/${TABLE_NAME}/search/?report_id=${id}`);
    const data = await response.json();
    const report = data.items?.[0];

    if (!report) return { statusCode: 404, body: 'Report not found' };

    // 1. 진짜 원본 URL 추출 (key 또는 article_url이 가장 정확함)
    const candidates = [report.key, report.article_url, report.telegram_url, report.download_url, report.attach_url];
    const pdfUrl = candidates.find(u => u && u.startsWith('http') && !u.includes('netlify.app'));

    if (!pdfUrl) return { statusCode: 404, body: 'Original PDF link not found' };

    const title = report.article_title || '증권사 리포트';
    const company = report.firm_nm || '증권사';
    
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

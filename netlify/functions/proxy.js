export const handler = async (event) => {
  const { url, filename, referer } = event.queryStringParameters;
  if (!url) return { statusCode: 400, body: 'URL missing' };

  const targetUrl = decodeURIComponent(url);
  const boardUrl = referer ? decodeURIComponent(referer) : targetUrl.replace('download.php', 'board.php');
  const isHead = event.httpMethod === 'HEAD';
  const targetHost = (() => {
    try {
      return new URL(targetUrl).hostname;
    } catch {
      return '';
    }
  })();

  try {
    // curl 명령어를 100% 완벽하게 모사한 헤더 세트 (보안 우회)
    const baseHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'ko,en-US;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Connection': 'keep-alive',
    };

    let cookies = '';
    if (referer) {
      console.log(`[Proxy] 1. 방문 및 쿠키 획득 시도...`);
      const boardRes = await fetch(boardUrl, { headers: baseHeaders, redirect: 'follow' });

      // AWS Lambda(Netlify) 환경 호환을 위한 완벽한 쿠키 파싱 로직
      if (boardRes.headers.getSetCookie) {
        cookies = boardRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
      } else {
        const fallbackCookie = boardRes.headers.get('set-cookie');
        cookies = fallbackCookie ? fallbackCookie.split(',').map(c => c.split(';')[0]).join('; ') : '';
      }
    }

    console.log(`[Proxy] 2. 다운로드 시도... (Cookies: ${cookies ? 'YES' : 'NO'})`);
    const dlHeaders = { ...baseHeaders, 'Referer': boardUrl, 'Cookie': cookies };
    const res = await fetch(targetUrl, { headers: dlHeaders, redirect: 'follow', method: isHead ? 'HEAD' : 'GET' });

    const contentType = res.headers.get('content-type') || '';
    if (isHead) {
      console.log(`[Proxy] HEAD 응답 Content-Type: ${contentType}`);
      if (contentType.includes('text/html')) {
        return {
          statusCode: 502,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          body: `<h3>${targetHost || 'PDF 소스'} 응답이 PDF가 아닙니다</h3>`,
        };
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': contentType || 'application/pdf',
          'Content-Disposition': `inline; filename="${encodeURIComponent(filename || 'report.pdf')}"`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Disposition, Content-Length, Content-Range, Content-Type',
          'Vary': 'Origin',
        },
        body: '',
      };
    }

    const buffer = await res.arrayBuffer();

    console.log(`[Proxy] 응답 Content-Type: ${contentType}, Size: ${buffer.byteLength} bytes`);

    // DS 서버 차단 시 HTML이 반환됨
    if (contentType.includes('text/html') || buffer.byteLength < 5000) {
      const htmlText = Buffer.from(buffer).toString('utf-8');
      console.error(
        `[Proxy] 에러 응답 내용 일부 (${targetHost || 'unknown host'}): ${htmlText.substring(0, 300)}`
      );
      return { 
        statusCode: 502, 
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: `<h3>${targetHost || 'PDF 소스'} 응답이 PDF가 아닙니다</h3><pre>${htmlText.substring(0, 500)}</pre>` 
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename || 'report.pdf')}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=3600', // 1시간 캐싱 허용
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Disposition, Content-Length, Content-Range, Content-Type',
        'Vary': 'Origin',
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error('[Proxy] Exception:', e);
    return { statusCode: 500, body: e.message };
  }
};

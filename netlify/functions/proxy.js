export const handler = async (event) => {
  const { url, filename, referer, warmup } = event.queryStringParameters;
  const isHead = event.httpMethod === 'HEAD';
  
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
    const baseHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
      'Accept': 'application/pdf,application/octet-stream,*/*',
      'Accept-Language': 'ko,en-US;q=0.9,en;q=0.8',
      'Connection': 'keep-alive',
    };

    let cookies = '';
    if (referer) {
      try {
        const boardRes = await fetch(boardUrl, { headers: baseHeaders, redirect: 'follow' });
        if (boardRes.headers.getSetCookie) {
          cookies = boardRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
        } else {
          const fallbackCookie = boardRes.headers.get('set-cookie');
          cookies = fallbackCookie ? fallbackCookie.split(',').map(c => c.split(';')[0]).join('; ') : '';
        }
      } catch (err) {
        console.error('[Proxy] Cookie fetch error:', err);
      }
    }

    const dlHeaders = { ...baseHeaders, 'Referer': boardUrl, 'Cookie': cookies };
    
    // 타겟 서버 요청 (HEAD인 경우 HEAD로, 아니면 GET으로)
    const res = await fetch(targetUrl, { 
      headers: dlHeaders, 
      redirect: 'follow',
      method: isHead ? 'HEAD' : 'GET'
    });

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
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
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
    return { statusCode: 500, body: e.message };
  }
};

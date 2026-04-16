const targetUrl = 'https://www.ds-sec.co.kr/bbs/download.php?bo_table=sub03_03&wr_id=2038&no=0&page=1';
const boardUrl = 'https://www.ds-sec.co.kr/bbs/board.php?bo_table=sub03_03&wr_id=2038&page=1';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ko,en-US;q=0.9,en;q=0.8',
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

async function test() {
  console.log('1. 방문 및 쿠키 획득 시도...');
  try {
    const res1 = await fetch(boardUrl, { headers, redirect: 'follow' });
    const setCookieHeader = res1.headers.get('set-cookie') || '';
    console.log('Status 1:', res1.status);
    console.log('Set-Cookie:', setCookieHeader);
    
    // 쿠키 파싱
    let cookies = '';
    if (res1.headers.getSetCookie) {
      cookies = res1.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    } else {
       // fallback
       cookies = setCookieHeader; 
    }
    console.log('Extracted Cookies:', cookies);

    console.log('\n2. 다운로드 시도...');
    const dlHeaders = { ...headers, 'Referer': boardUrl, 'Cookie': cookies };
    const res2 = await fetch(targetUrl, { headers: dlHeaders, redirect: 'follow' });
    
    const contentType = res2.headers.get('content-type');
    console.log('Status 2:', res2.status);
    console.log('Content-Type:', contentType);
    
    const buffer = await res2.arrayBuffer();
    console.log('Size:', buffer.byteLength, 'bytes');

    if (contentType && contentType.includes('text/html')) {
        const text = Buffer.from(buffer).toString('utf-8');
        console.log('에러 페이지 내용:\n', text.substring(0, 300));
    }
  } catch (e) {
    console.error('Error:', e);
  }
}
test();

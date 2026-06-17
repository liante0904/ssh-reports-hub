export function getShareUrl(reportId, origin = window.location.origin) {
  return `${origin}/share?id=${reportId}`;
}

export function isDsReport(report) {
  const { firm, firm_id, sec_firm_order, link, download_url, pdf_url } = report || {};
  const sourceUrl = pdf_url || download_url || link || '';
  return String(sec_firm_order) === '11' ||
    String(firm_id) === '11' ||
    firm?.includes('DS') ||
    firm?.includes('디에스') ||
    sourceUrl.includes('ds-sec.co.kr');
}

export function getProxyPdfUrl(report, origin = window.location.origin) {
  const { title = 'report', firm = '증권사', link = '' } = report || {};
  const sourceUrl = report?.pdf_url || report?.download_url || link;
  if (!sourceUrl || sourceUrl === '#') return '';

  const fileName = encodeURIComponent(`[${firm}] ${title}.pdf`);
  const referer = report?.article_url;
  const functionName = isDsReport(report) ? 'proxy-ds' : 'proxy';
  return `${origin}/.netlify/functions/${functionName}?url=${encodeURIComponent(sourceUrl)}&filename=${fileName}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`;
}

const prefetchedPdfUrls = new Set();

export function prefetchPdf(report, origin = window.location.origin) {
  // 절약 모드 / 2G 이하 → 스킵
  const connection = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
  if (connection?.saveData || /(^|-)2g$/i.test(connection?.effectiveType || '')) return;

  const proxyUrl = getProxyPdfUrl(report, origin);
  if (!proxyUrl || prefetchedPdfUrls.has(proxyUrl)) return;

  prefetchedPdfUrls.add(proxyUrl);

  // <link rel="prefetch"> → 브라우저가 HTTP 캐시에 미리 다운로드
  // iframe이 같은 URL 열면 캐시에서 즉시 로드 (0ms)
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = proxyUrl;
  link.as = 'document';
  document.head.appendChild(link);

  // fallback: prefetch 지원 안 하는 구형 브라우저용
  if (!('relList' in HTMLLinkElement.prototype)) {
    fetch(proxyUrl, { method: 'GET', cache: 'force-cache' })
      .then((res) => res.arrayBuffer())
      .catch(() => { prefetchedPdfUrls.delete(proxyUrl); });
  }
}

export function getDirectUrl(report) {
  const { id, link } = report;
  
  // 1. 반드시 프록시(share)를 타야 하는 경우 (CORS, 쿠키 등 대행이 필수적인 곳)
  // DS투자증권, 흥국증권은 share URL이 더 안정적
  const isDs = isDsReport(report);
  const isHeungkuk = String(report?.sec_firm_order) === '28' || (report?.firm_nm || report?.firm || '').includes('흥국');

  const needsProxy =
    isDs ||
    isHeungkuk ||
    !link || link === '#';

  if (needsProxy) {
    return getShareUrl(id);
  }

  // 2. DB증권을 포함한 일반적인 경우는 원본 링크(link)로 즉시 이동하여 성능 최적화
  return link;
}

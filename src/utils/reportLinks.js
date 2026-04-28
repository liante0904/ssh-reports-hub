export function getShareUrl(reportId, origin = window.location.origin) {
  return `${origin}/share?id=${reportId}`;
}

export function getDirectUrl(report) {
  const { id, telegram_url, article_url, firm } = report;
  
  // 1. 반드시 프록시(share)를 타야 하는 경우 (CORS, 쿠키, 혹은 특수 게이트웨이)
  const needsProxy = 
    firm?.includes('DS투자') || 
    firm?.includes('DB금융') || 
    firm?.includes('DB투자') ||
    telegram_url?.includes('dbsec.co.kr') ||
    telegram_url?.includes('db-fi.com') ||
    !telegram_url; // 링크가 없는 경우 share.js에서 다른 필드(key 등)를 시도하게 함

  if (needsProxy) {
    return getShareUrl(id);
  }

  // 2. 그 외 일반적인 경우는 원본 링크(telegram_url)로 즉시 이동하여 성능 최적화
  return telegram_url || article_url;
}

export function getShareUrl(reportId, origin = window.location.origin) {
  return `${origin}/share?id=${reportId}`;
}

export function getDirectUrl(report) {
  const { id, link, firm } = report;
  
  // 1. 반드시 프록시(share)를 타야 하는 경우 (CORS, 쿠키, 혹은 특수 게이트웨이)
  const needsProxy = 
    firm?.includes('DS투자') || 
    firm?.includes('DB금융') || 
    firm?.includes('DB투자') ||
    link?.includes('dbsec.co.kr') ||
    link?.includes('db-fi.com') ||
    !link || link === '#';

  if (needsProxy) {
    return getShareUrl(id);
  }

  // 2. 그 외 일반적인 경우는 원본 링크(link)로 즉시 이동하여 성능 최적화
  return link;
}

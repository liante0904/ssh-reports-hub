export function getShareUrl(reportId, origin = window.location.origin) {
  return `${origin}/share?id=${reportId}`;
}

export function getDirectUrl(report) {
  const { id, link, firm, firm_id } = report;
  
  // 1. 반드시 프록시(share)를 타야 하는 경우 (CORS, 쿠키 등 대행이 필수적인 곳)
  // DS투자증권은 여전히 프록시가 안정적임
  const isDs = firm?.includes('DS투자') || String(firm_id) === '103';
  
  const needsProxy = 
    isDs || 
    !link || link === '#';

  if (needsProxy) {
    return getShareUrl(id);
  }

  // 2. DB증권을 포함한 일반적인 경우는 원본 링크(link)로 즉시 이동하여 성능 최적화
  return link;
}

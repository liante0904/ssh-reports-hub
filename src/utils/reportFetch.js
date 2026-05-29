function buildReportRoute(pathname, baseUrl) {
  const apiUrl = baseUrl.replace(/\/$/, '');
  const params = new URLSearchParams();

  if (pathname.includes('global')) {
    params.append('mkt_tp', 'global');
  }
  // 산업 페이지 → 전용 /industry 엔드포인트 사용
  if (pathname.includes('industry')) {
    return { apiUrl: `${apiUrl}/industry`, params };
  }
  // 그 외(최근, 검색, outlook, ai-summary 등) → 통합 /search 엔드포인트

  return { apiUrl: `${apiUrl}/search`, params };
}

export function buildReportFetchUrl({ pathname, offset, sortBy, searchQuery, baseUrl, outlookYear }) {
  const { apiUrl, params } = buildReportRoute(pathname, baseUrl);

  params.append('offset', offset);

  if (sortBy === 'company') {
    params.append('sort', 'company');
  }

  if (searchQuery?.query && searchQuery?.category) {
    const searchValue = searchQuery.category === 'company'
      ? (searchQuery.companyOrder ?? searchQuery.query)
      : searchQuery.query;
    params.append(searchQuery.category, searchValue);
  }

  if (searchQuery?.board !== null && searchQuery?.board !== undefined) {
    params.append('board', searchQuery.board);
  }

  if (pathname.includes('ai-summary')) {
    params.append('has_summary', 'true');
  }

  if (pathname.includes('outlook')) {
    params.append('outlook', 'true');
    if (outlookYear) {
      params.append('outlook_year', outlookYear);
    }
  }

  return `${apiUrl}?${params.toString()}`;
}

function buildReportRoute(pathname, baseUrl) {
  const apiUrl = baseUrl.replace(/\/$/, '');
  const params = new URLSearchParams();

  if (pathname.includes('global')) {
    params.append('mkt_tp', 'global');
  }
  // industry, search 등 모두 동일한 /search 엔드포인트 사용
  // (external_api.py의 /search가 통합 검색)

  return { apiUrl: `${apiUrl}/search`, params };
}

export function buildReportFetchUrl({ pathname, offset, sortBy, searchQuery, baseUrl }) {
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

  return `${apiUrl}?${params.toString()}`;
}

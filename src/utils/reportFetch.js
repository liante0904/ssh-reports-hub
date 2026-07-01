function buildReportRoute(pathname, baseUrl) {
  const apiUrl = baseUrl.replace(/\/$/, '');
  const params = new URLSearchParams();

  if (pathname.includes('global')) {
    return { apiUrl: `${apiUrl}/global`, params };
  }
  // 산업 페이지 → 전용 /industry 엔드포인트 사용
  if (pathname.includes('industry')) {
    return { apiUrl: `${apiUrl}/industry`, params };
  }
  // 최근 페이지 → 전용 /recent 엔드포인트 사용
  if (pathname.includes('recent')) {
    return { apiUrl: `${apiUrl}/recent`, params };
  }
  // 그 외(최근, 검색, outlook, ai-summary 등) → 통합 /search 엔드포인트

  return { apiUrl: `${apiUrl}/search`, params };
}

export function buildReportFetchUrl({ pathname, offset, sortBy, searchQuery, baseUrl, outlookYear, limit }) {
  const { apiUrl, params } = buildReportRoute(pathname, baseUrl);

  params.append('offset', offset);

  // limit가 제공되었거나 최근 페이지인 경우 limit 파라미터 추가
  if (limit) {
    params.append('limit', limit);
  } else if (pathname.includes('recent')) {
    // 최근 페이지 무한스크롤 시 기본 limit를 30으로 설정
    params.append('limit', 30);
  }

  if (sortBy === 'company') {
    params.append('sort', 'company');
  }

  if (searchQuery?.query && searchQuery?.category && searchQuery.category !== 'company') {
    params.append(searchQuery.category, searchQuery.query);
  }

  if (searchQuery?.companyOrder) {
    params.append('company', searchQuery.companyOrder);
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

function buildReportRoute(pathname, baseUrl, tableName) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const normalizedTableName = tableName.replace(/^\//, '').replace(/\/$/, '');
  let apiUrl = `${normalizedBaseUrl}/${normalizedTableName}`;
  const params = new URLSearchParams();

  if (pathname.includes('global')) {
    apiUrl += '/search/';
    params.append('mkt_tp', 'global');
  } else if (pathname.includes('industry')) {
    apiUrl += '/industry';
  } else {
    apiUrl += '/search/';
  }

  return { apiUrl, params };
}

export function buildReportFetchUrl({ pathname, offset, sortBy, searchQuery, baseUrl, tableName }) {
  const { apiUrl, params } = buildReportRoute(pathname, baseUrl, tableName);

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

  return `${apiUrl}?${params.toString()}`;
}

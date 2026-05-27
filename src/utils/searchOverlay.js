export function resolveSearchOverlayState({ pendingSearch, searchParams }) {
  if (pendingSearch?.query) {
    return {
      query: pendingSearch.query,
      category: pendingSearch.category || 'title',
      companyOrder: pendingSearch.companyOrder ?? null,
      shouldSearch: true,
      shouldClearPending: true,
    };
  }

  const urlQuery = searchParams.get('q') || '';
  const urlCategory = searchParams.get('category') || 'title';

  return {
    query: urlQuery,
    category: urlQuery ? urlCategory : 'title',
    companyOrder: urlCategory === 'company' ? urlQuery : null,
    shouldSearch: false,
    shouldClearPending: false,
  };
}

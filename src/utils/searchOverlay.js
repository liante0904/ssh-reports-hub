export function resolveSearchOverlayState({ pendingSearch, searchParams }) {
  if (pendingSearch?.query) {
    return {
      query: pendingSearch.query,
      category: pendingSearch.category || 'title',
      shouldSearch: true,
      shouldClearPending: true,
    };
  }

  const urlQuery = searchParams.get('q') || '';
  const urlCategory = searchParams.get('category') || 'title';

  return {
    query: urlQuery,
    category: urlQuery ? urlCategory : 'title',
    shouldSearch: false,
    shouldClearPending: false,
  };
}

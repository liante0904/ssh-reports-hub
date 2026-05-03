export function createClearedSearch() {
  return { query: '', category: '', board: null, companyOrder: null };
}

export function createCompanySearch(companyOrder) {
  const normalizedCompanyOrder = companyOrder === null || companyOrder === undefined || companyOrder === ''
    ? null
    : String(companyOrder);

  return {
    query: normalizedCompanyOrder ?? '',
    category: 'company',
    board: null,
    companyOrder: normalizedCompanyOrder,
  };
}

export function toggleBoardSearch(activeSearch, boardOrder) {
  return {
    ...activeSearch,
    board: activeSearch.board === boardOrder ? null : boardOrder,
    category: 'company',
    companyOrder: activeSearch.companyOrder ?? (activeSearch.query || null),
  };
}

export function normalizeSearchSelection(nextSearch) {
  const query = nextSearch?.query ?? '';
  const category = nextSearch?.category ?? '';
  const board = category === 'company' ? (nextSearch?.board ?? null) : null;
  const companyOrder = category === 'company'
    ? (nextSearch?.companyOrder ?? query ?? null)
    : null;

  return { query, category, board, companyOrder };
}

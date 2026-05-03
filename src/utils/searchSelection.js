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

export function buildSearchParams(search) {
  const params = {};
  const normalized = normalizeSearchSelection(search);

  if (normalized.query) {
    params.q = normalized.query;
  }

  if (normalized.category) {
    params.category = normalized.category;
  }

  if (normalized.board !== null && normalized.board !== undefined) {
    params.board = normalized.board.toString();
  }

  return params;
}

export function parseSearchParams(searchParams) {
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const board = searchParams.get('board');
  const normalized = normalizeSearchSelection({
    query,
    category,
    board: board ? Number(board) : null,
    companyOrder: category === 'company' ? query : null,
  });

  return normalized;
}

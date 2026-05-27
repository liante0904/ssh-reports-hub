export function createEmptySearchSelection() {
  return { query: '', category: '', board: null, companyOrder: null };
}

export function createClearedSearch() {
  return createEmptySearchSelection();
}

export function createTextSearch(query, category) {
  return {
    ...createEmptySearchSelection(),
    query: query ?? '',
    category: category ?? '',
  };
}

export function createCompanySearch(companyOrder) {
  const normalizedCompanyOrder = companyOrder === null || companyOrder === undefined || companyOrder === ''
    ? null
    : String(companyOrder);

  return {
    ...createEmptySearchSelection(),
    query: normalizedCompanyOrder ?? '',
    category: 'company',
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
  const base = createEmptySearchSelection();
  const query = nextSearch?.query ?? base.query;
  const category = nextSearch?.category ?? base.category;
  const board = category === 'company' ? (nextSearch?.board ?? base.board) : base.board;
  const companyOrder = category === 'company'
    ? (nextSearch?.companyOrder ?? query ?? base.companyOrder)
    : base.companyOrder;

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

export function getSelectedCompanyOrder(activeSearch, fallbackQuery = '') {
  if (activeSearch?.category !== 'company') {
    return fallbackQuery;
  }

  return activeSearch.companyOrder ?? activeSearch.query ?? fallbackQuery;
}

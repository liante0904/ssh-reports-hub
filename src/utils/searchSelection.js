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
  const board = nextSearch?.board ?? base.board;
  const companyOrder = nextSearch?.companyOrder ?? base.companyOrder;

  return { query, category, board, companyOrder };
}

export function buildSearchParams(search) {
  const params = new URLSearchParams();
  const normalized = normalizeSearchSelection(search);

  if (normalized.query && normalized.category && normalized.category !== 'company') {
    params.set('q', normalized.query);
    params.set('category', normalized.category);
  }

  if (normalized.companyOrder) {
    params.set('company', normalized.companyOrder);
  }

  if (normalized.board !== null && normalized.board !== undefined) {
    params.set('board', normalized.board.toString());
  }

  return params;
}

export function parseSearchParams(searchParams) {
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const board = searchParams.get('board');
  const company = searchParams.get('company');

  const normalized = normalizeSearchSelection({
    query,
    category: company ? 'company' : category,
    board: board ? Number(board) : null,
    companyOrder: company || null,
  });

  return normalized;
}

export function getSelectedCompanyOrder(activeSearch, fallbackQuery = '') {
  if (activeSearch?.category !== 'company') {
    return fallbackQuery;
  }

  return activeSearch.companyOrder ?? activeSearch.query ?? fallbackQuery;
}

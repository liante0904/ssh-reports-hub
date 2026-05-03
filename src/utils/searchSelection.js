export function createClearedSearch() {
  return { query: '', category: '', board: null };
}

export function createCompanySearch(query) {
  return { query, category: 'company', board: null };
}

export function toggleBoardSearch(activeSearch, boardOrder) {
  return {
    ...activeSearch,
    board: activeSearch.board === boardOrder ? null : boardOrder,
  };
}

export function normalizeSearchSelection(nextSearch) {
  const query = nextSearch?.query ?? '';
  const category = nextSearch?.category ?? '';
  const board = category === 'company' ? (nextSearch?.board ?? null) : null;

  return { query, category, board };
}

import { createClearedSearch } from './searchSelection';

export const HEADER_PATHS = {
  recent: '/',
  global: '/global',
  industry: '/industry',
  favorites: '/favorites',
  ai_summary: '/ai-summary',
  search: '/',
};

export function resetHeaderSearch({ setIsSearchActive, handleSearch, setQuery, setSearchParams, setSortBy }) {
  setIsSearchActive(false);
  handleSearch(createClearedSearch());
  setQuery('');
  setSearchParams({}, { replace: true });
  setSortBy('time');
}

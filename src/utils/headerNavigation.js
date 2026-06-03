import { createClearedSearch } from './searchSelection';

export const HEADER_PATHS = {
  home: '/',
  recent: '/recent',
  global: '/global',
  industry: '/industry',
  favorites: '/favorites',
  outlook: '/outlook',
  ai_summary: '/ai-summary',
  fnguide: '/fnguide',
  search: '/recent',
};

export function resetHeaderSearch({ setIsSearchActive, handleSearch, setQuery, setSearchParams, setSortBy }) {
  setIsSearchActive(false);
  handleSearch(createClearedSearch());
  setQuery('');
  setSearchParams({}, { replace: true });
  setSortBy('time');
}

import { useCallback, useEffect, useState } from 'react';
import {
  buildSearchParams,
  createClearedSearch,
  createCompanySearch,
  createTextSearch,
  getSelectedCompanyOrder,
  parseSearchParams,
  toggleBoardSearch,
} from '../utils/searchSelection';

export function useHeaderSearchState({
  activeSearch,
  boards,
  handleSearch,
  navigate,
  searchParams,
  setSearchParams,
  setSortBy,
  toggleSearch,
}) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const selectedCompanyOrder = getSelectedCompanyOrder(activeSearch, query);
  const showBoardSelect = activeSearch.category === 'company' && boards.length > 0;

  const syncSearchParams = useCallback((nextSearch) => {
    setSearchParams(buildSearchParams(nextSearch), { replace: true });
  }, [setSearchParams]);

  const clearSearchState = useCallback((options = {}) => {
    const { navigateHome = true } = options;
    setIsSearchActive(false);
    setQuery('');
    handleSearch(createClearedSearch());
    setSearchParams({}, { replace: true });
    setSortBy('time');
    if (navigateHome) {
      navigate({ pathname: '/' });
    }
  }, [handleSearch, navigate, setSearchParams, setSortBy]);

  const handleSearchButtonClick = useCallback(() => {
    setIsSearchActive(true);
    setQuery('');
    toggleSearch();
  }, [toggleSearch]);

  const handleCompanyChange = useCallback((e) => {
    const selectedValue = e.target.value;
    setQuery(selectedValue);
    setIsSearchActive(true);
    setSortBy('time');

    if (selectedValue) {
      const nextSearch = createCompanySearch(selectedValue);
      handleSearch(nextSearch);
      syncSearchParams(nextSearch);
    } else {
      clearSearchState();
    }

    navigate({ pathname: '/' });
  }, [clearSearchState, handleSearch, navigate, setSortBy, syncSearchParams]);

  const handleBoardChange = useCallback((e) => {
    const selectedValue = e.target.value;
    const boardOrder = selectedValue === '' ? null : Number(selectedValue);
    const nextSearch = toggleBoardSearch(activeSearch, boardOrder);
    handleSearch(nextSearch);
    syncSearchParams(nextSearch);
  }, [activeSearch, handleSearch, syncSearchParams]);

  const handleTitleClick = useCallback(() => {
    clearSearchState();
  }, [clearSearchState]);

  useEffect(() => {
    const urlSearch = parseSearchParams(searchParams);
    if (urlSearch.category === 'company' || urlSearch.query) {
      const nextQuery = urlSearch.category === 'company'
        ? (urlSearch.companyOrder ?? urlSearch.query)
        : urlSearch.query;
      setQuery(nextQuery);
      setIsSearchActive(Boolean(urlSearch.query || urlSearch.category));
      handleSearch(urlSearch.category === 'company'
        ? urlSearch
        : createTextSearch(urlSearch.query, urlSearch.category));
    } else {
      setQuery('');
      setIsSearchActive(false);
    }
  }, [handleSearch, searchParams]);

  return {
    clearSearchState,
    handleBoardChange,
    handleCompanyChange,
    handleSearchButtonClick,
    handleTitleClick,
    isSearchActive,
    query,
    selectedCompanyOrder,
    setIsSearchActive,
    setQuery,
    showBoardSelect,
  };
}

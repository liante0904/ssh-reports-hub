import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReport } from '../context/useReport';
import { resolveSearchOverlayState } from '../utils/searchOverlay';
import { createCompanySearch, createClearedSearch } from '../utils/searchSelection';
import './SearchOverlay.css';
import CompanySelect from './CompanySelect';

function SearchOverlay() {
  const { 
    isSearchOpen, 
    toggleSearch, 
    handleSearch: onSearch, 
    pendingSearch,
    setPendingSearch
  } = useReport();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('title');
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef(null);
  const selectedCompanyOrder = pendingSearch?.companyOrder ?? pendingSearch?.query ?? '';

  // 오버레이 열릴 때 상태 복원 및 외부(pendingSearch) 동기화
  useEffect(() => {
    if (!isSearchOpen) return;

    const { query: nextQuery, category: nextCategory, companyOrder, shouldSearch, shouldClearPending } =
      resolveSearchOverlayState({ pendingSearch, searchParams });

    setQuery(nextQuery);
    setCategory(nextCategory);

    if (shouldSearch) {
      onSearch(
        nextCategory === 'company'
          ? createCompanySearch(companyOrder ?? nextQuery)
          : { query: nextQuery, category: nextCategory, board: null, companyOrder: null }
      );
      setSearchParams({ q: nextQuery, category: nextCategory });
    }

    if (shouldClearPending) {
      setPendingSearch({ query: '', category: '' });
    }
  }, [isSearchOpen, searchParams, pendingSearch, setPendingSearch, onSearch, setSearchParams]);

  const showToast = useCallback((message) => {
    setToast({ visible: true, message });
    setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 2000);
  }, []);

  useEffect(() => {
    if (isSearchOpen && inputRef.current && category !== 'company') {
      inputRef.current.focus();
    }
  }, [isSearchOpen, category]);

  const handleSearchClick = useCallback(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery && category !== 'company') {
      showToast('검색어를 입력해주세요.');
      return;
    }

    setSearchParams({ q: trimmedQuery, category });
    onSearch(category === 'company'
      ? createCompanySearch(trimmedQuery)
      : { query: trimmedQuery, category, board: null, companyOrder: null });
  }, [query, category, onSearch, setSearchParams, showToast]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        handleSearchClick();
      }
    },
    [handleSearchClick]
  );

  const handleCategoryChange = useCallback(
    (e) => {
      const newCategory = e.target.value;
      setCategory(newCategory);
      setQuery('');
      setSearchParams({}, { replace: true });
      if (newCategory === 'company') {
        onSearch(createClearedSearch());
      }
    },
    [onSearch, setSearchParams]
  );

  const handleCompanyChange = useCallback(
    (e) => {
      const selectedValue = e.target.value;
      setQuery(selectedValue);
      if (selectedValue) {
        setSearchParams({ q: selectedValue, category: 'company' }, { replace: true });
        onSearch(createCompanySearch(selectedValue));
      } else {
        setSearchParams({}, { replace: true });
        onSearch(createClearedSearch());
      }
    },
    [onSearch, setSearchParams]
  );

  if (!isSearchOpen) {
    return null;
  }

  return (
    <>
      <div className={`search-overlay ${isSearchOpen ? 'visible' : ''}`} id="searchOverlay" onClick={toggleSearch}>
        <div className="search-container" onClick={(e) => e.stopPropagation()}>
          <select
            id="searchCategory"
            className="search-category"
            value={category}
            onChange={handleCategoryChange}
          >
            <option value="title">제목</option>
            <option value="writer">작성자</option>
            <option value="company">증권사</option>
          </select>

          {category === 'company' ? (
            <CompanySelect value={selectedCompanyOrder} onChange={handleCompanyChange} className="company-select" />
          ) : (
            <input
              type="text"
              id="searchInput"
              placeholder="검색어 입력..."
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              ref={inputRef}
            />
          )}

          {category !== 'company' && (
            <button
              className="search-submit"
              onClick={handleSearchClick}
            >
              검색
            </button>
          )}
        </div>
      </div>
      
      <div className={`toast-container ${toast.visible ? 'visible' : ''}`}>
        {toast.message}
      </div>
    </>
  );
}

export default SearchOverlay;

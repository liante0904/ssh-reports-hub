import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReport } from '../context/useReport';
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

  // 오버레이 열릴 때 상태 복원 및 외부(pendingSearch) 동기화
  useEffect(() => {
    if (isSearchOpen) {
      // 1. 외부에서 클릭(예: 작성자 클릭)을 통한 정보가 있으면 우선 사용
      if (pendingSearch?.query) {
        const { query: pQuery, category: pCategory } = pendingSearch;
        setQuery(pQuery);
        setCategory(pCategory || 'title');
        
        // 검색 자동 실행
        onSearch({ query: pQuery, category: pCategory || 'title', board: null });
        setSearchParams({ q: pQuery, category: pCategory || 'title' });

        // 사용했으니 비워줌
        setPendingSearch({ query: '', category: '' });
      } 
      // 2. 그 외 일반 오픈 시에는 URL 파라미터가 있을 때만 복원
      else {
        const urlQuery = searchParams.get('q') || '';
        const urlCategory = searchParams.get('category') || 'title';
        if (urlQuery) {
          setQuery(urlQuery);
          setCategory(urlCategory);
        } else {
          setQuery('');
          setCategory('title');
        }
      }
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
    onSearch({ query: trimmedQuery, category, board: null });
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
    },
    [setSearchParams]
  );

  const handleCompanyChange = useCallback(
    (e) => {
      const selectedValue = e.target.value;
      setQuery(selectedValue);
      if (selectedValue) {
        setSearchParams({ q: selectedValue, category: 'company' }, { replace: true });
        onSearch({ query: selectedValue, category: 'company', board: null });
      } else {        setSearchParams({}, { replace: true });
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
            <CompanySelect value={query} onChange={handleCompanyChange} className="company-select" />
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

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReport } from '../context/ReportContext';
import './SearchOverlay.css';
import CompanySelect from './CompanySelect';

function SearchOverlay() {
  const { isSearchOpen, toggleSearch, handleSearch: onSearch, searchQuery } = useReport();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('title');
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef(null);
  const isInitialMount = useRef(true);

  // 오버레이 열릴 때 상태 복원 및 외부(searchQuery) 동기화
  useEffect(() => {
    if (isSearchOpen) {
      // 1. 외부에서 클릭(예: 작성자 클릭)을 통한 정보가 있으면 우선 사용
      if (searchQuery?.query && searchQuery.category === 'writer') {
        setQuery(searchQuery.query);
        setCategory('writer');
      } 
      // 2. 그 외 초기 오픈 시 URL 파라미터에서 복원
      else if (isInitialMount.current) {
        const urlQuery = searchParams.get('q') || '';
        const urlCategory = searchParams.get('category') || 'title';
        setQuery(urlQuery);
        setCategory(urlCategory);
        isInitialMount.current = false;
      }
    } else {
      // 닫힐 때 초기화
      setQuery('');
      setCategory('title');
      isInitialMount.current = true;
    }
  }, [isSearchOpen, searchParams, searchQuery]);

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
    onSearch({ query: trimmedQuery, category });
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
        onSearch({ query: selectedValue, category: 'company' });
      } else {
        setSearchParams({}, { replace: true });
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
            <CompanySelect value={query} onChange={handleCompanyChange} />
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

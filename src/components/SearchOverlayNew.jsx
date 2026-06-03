import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useReport } from '../context/useReport';
import {
  buildSearchParams,
} from '../utils/searchSelection';
import './SearchOverlayNew.css';
import CompanySelect from './CompanySelect';

function SearchOverlayNew() {
  const {
    isSearchNewOpen: isSearchOpen,
    toggleSearchNew: toggleSearch,
    handleSearch: onSearch,
    activeSearch,
    sortBy,
    setSortBy,
  } = useReport();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // 로컬 검색/필터 상태
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('title');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('recent');
  const [selectedSort, setSelectedSort] = useState('time');
  const inputRef = useRef(null);

  // 현재 pathname을 기준으로 selectedRoute(탭 분류)를 파악
  const getRouteFromPathname = useCallback((path) => {
    if (path.includes('global')) return 'global';
    if (path.includes('industry')) return 'industry';
    if (path.includes('outlook')) return 'outlook';
    if (path.includes('ai-summary')) return 'ai-summary';
    return 'recent';
  }, []);

  // 오버레이가 열릴 때 현재 상태들을 로컬 상태로 로딩
  useEffect(() => {
    if (!isSearchOpen) return;

    // 1. 경로 탭 설정
    setSelectedRoute(getRouteFromPathname(location.pathname));

    // 2. 검색어 및 카테고리 로딩
    const q = searchParams.get('q') || activeSearch.query || '';
    const cat = searchParams.get('category') || activeSearch.category || 'title';
    // 만약 카테고리가 company면 query는 비워둠 (텍스트 검색이 아니므로)
    if (cat === 'company') {
      setQuery('');
      setCategory('title'); // 텍스트 검색 셀렉트박스는 기본 '제목'으로
    } else {
      setQuery(q);
      setCategory(cat);
    }

    // 3. 증권사 필터 로딩
    const company = searchParams.get('company') || activeSearch.companyOrder || '';
    setSelectedCompany(company);

    // 4. 정렬 로딩
    setSelectedSort(sortBy || 'time');
  }, [isSearchOpen, location.pathname, searchParams, activeSearch, sortBy, getRouteFromPathname]);

  // 포커싱 처리
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  // 필터 초기화
  const handleReset = useCallback(() => {
    setQuery('');
    setCategory('title');
    setSelectedCompany('');
    setSelectedRoute('recent');
    setSelectedSort('time');
  }, []);

  // 필터 및 검색 적용
  const handleApply = useCallback(() => {
    const trimmedQuery = query.trim();
    
    // activeSearch 객체 빌드
    const isCompanyOnly = !trimmedQuery && selectedCompany;
    
    const nextSearch = {
      query: isCompanyOnly ? selectedCompany : trimmedQuery,
      category: isCompanyOnly ? 'company' : (trimmedQuery ? category : ''),
      companyOrder: selectedCompany || null,
      board: null, // 통합 검색 적용 시 개별 게시판 필터는 초기화
    };

    // 전역 상태 반영
    setSortBy(selectedSort);
    onSearch(nextSearch);

    // URL 쿼리 파라미터 빌드
    const nextParams = buildSearchParams(nextSearch);

    // 이동할 타겟 경로 결정
    const targetPath = `/${selectedRoute === 'recent' ? 'recent' : selectedRoute}`;

    // 이동 처리
    navigate({
      pathname: targetPath,
      search: `?${new URLSearchParams(nextParams).toString()}`,
    });

    // 오버레이 닫기
    toggleSearch();
  }, [query, category, selectedCompany, selectedRoute, selectedSort, onSearch, setSortBy, navigate, toggleSearch]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        handleApply();
      }
    },
    [handleApply]
  );

  if (!isSearchOpen) {
    return null;
  }

  return (
    <>
      <div className={`search-overlay ${isSearchOpen ? 'visible' : ''}`} id="searchOverlayNew" onClick={toggleSearch}>
        <div className="search-container" onClick={(e) => e.stopPropagation()}>
          <div className="search-header-title">
            <span>🔍 통합 검색 및 필터 설정 (신규)</span>
            <button className="search-close-top" onClick={toggleSearch}>✕</button>
          </div>

          <div className="filter-section">
            <label className="section-label">텍스트 검색</label>
            <div className="text-search-row">
              <select
                id="searchCategory"
                className="search-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="title">제목</option>
                <option value="writer">작성자</option>
                <option value="tag">태그</option>
                <option value="sector">산업</option>
                <option value="stock">종목명</option>
              </select>
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
            </div>
          </div>

          <div className="filter-section">
            <label className="section-label">증권사 필터</label>
            <div className="company-select-row">
              <CompanySelect
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="company-select-full"
              />
            </div>
          </div>

          <div className="filter-section">
            <label className="section-label">조회 대상 분류 (메뉴)</label>
            <div className="chip-group">
              {[
                { id: 'recent', label: '최근 레포트', icon: '🕘' },
                { id: 'global', label: '글로벌 레포트', icon: '🌍' },
                { id: 'industry', label: '산업 레포트', icon: '🏭' },
                { id: 'outlook', label: '전망 레포트', icon: '🔮' },
                { id: 'ai-summary', label: 'AI요약 리포트', icon: '🤖' },
              ].map((route) => (
                <button
                  key={route.id}
                  type="button"
                  className={`chip-item ${selectedRoute === route.id ? 'active' : ''}`}
                  onClick={() => setSelectedRoute(route.id)}
                >
                  <span className="chip-icon">{route.icon}</span>
                  <span className="chip-text">{route.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <label className="section-label">정렬 기준</label>
            <div className="chip-group sort-group">
              {[
                { id: 'time', label: '최근 등록일 순', icon: '⏱️' },
                { id: 'company', label: '증권사 가나다 순', icon: '🗂️' },
              ].map((sort) => (
                <button
                  key={sort.id}
                  type="button"
                  className={`chip-item ${selectedSort === sort.id ? 'active' : ''}`}
                  onClick={() => setSelectedSort(sort.id)}
                >
                  <span className="chip-icon">{sort.icon}</span>
                  <span className="chip-text">{sort.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="search-actions">
            <button type="button" className="btn-reset" onClick={handleReset}>
              🔄 필터 초기화
            </button>
            <button type="button" className="btn-submit" onClick={handleApply}>
              🔍 설정된 필터 적용
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default SearchOverlayNew;

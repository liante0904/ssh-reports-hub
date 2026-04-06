import React, { useState, useEffect, forwardRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import HamburgerMenu from './HamburgerMenu';
import CompanySelect from './CompanySelect';
import './Header.css';

const Header = forwardRef(({
  toggleSearch,
  toggleMenuTop,
  isTopMenuOpen,
  toggleFloatingMenu,
  isFloatingMenuOpen,
  onSearch,
  isNavVisible
}, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1023);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1023);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const isRecent = location.pathname === '/';
  const isGlobal = location.pathname.includes('global');
  const isIndustry = location.pathname.includes('industry');
  const isFavorites = location.pathname.includes('favorites');
  const isCompany = location.pathname.startsWith('/company');

  const firm_names = [
    "LS증권", "신한증권", "NH투자증권", "하나증권", "KB증권", "삼성증권",
    "상상인증권", "신영증권", "미래에셋증권", "현대차증권", "키움증권", "DS투자증권",
    "유진투자증권", "한국투자증권", "다올투자증권", "토스증권", "리딩투자증권", "대신증권",
    "IM증권", "DB금융투자", "메리츠증권", "한화투자증권", "한양증권", "BNK투자증권",
    "교보증권", "IBK투자증권"
  ];

  const handleButtonClick = (buttonName) => {
    // 1. 공통 메뉴/검색 상태 초기화
    if (isTopMenuOpen) toggleMenuTop();
    if (isFloatingMenuOpen) toggleFloatingMenu();
    
    // 2. 검색 상태 초기화
    onSearch({ query: '', category: '' });
    setIsSearchActive(buttonName === 'search');
    
    if (buttonName !== 'search') {
      setQuery('');
      setSearchParams({}, { replace: true });
    }

    // 3. 경로 매핑 처리
    const PATH_MAP = {
      recent: '/',
      global: '/global',
      industry: '/industry',
      favorites: '/favorites',
      search: '/'
    };

    const targetPath = PATH_MAP[buttonName];
    if (targetPath) {
      navigate({ pathname: targetPath });
    }

    // 4. 검색 버튼 전용 로직
    if (buttonName === 'search') {
      setQuery('');
      toggleSearch();
    }
  };

  const handleCompanyChange = (e) => {
    const selectedValue = e.target.value; // <option>의 value (인덱스)
    const company = selectedValue ? firm_names[selectedValue] : '';
    console.log('Header: 선택된 회사:', { selectedValue, company });

    setQuery(selectedValue);
    setIsSearchActive(true);

    if (selectedValue) {
      setSearchParams({ q: selectedValue, category: 'company' }, { replace: true });
      if (typeof onSearch === 'function') {
        onSearch({ query: selectedValue, category: 'company' });
      } else {
        console.warn('onSearch is not a function');
      }
    } else {
      setSearchParams({}, { replace: true });
      if (typeof onSearch === 'function') {
        onSearch({ query: '', category: 'company' });
      }
    }

    navigate({ pathname: '/' });
  };

  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    const urlCategory = searchParams.get('category') || '';
    if (urlCategory === 'company') {
      setQuery(urlQuery);
      setIsSearchActive(true);
    } else {
      setQuery('');
    }
  }, [searchParams]);

  return (
    <>
      <header ref={ref} className={!isNavVisible && isMobile ? 'nav-hidden' : ''}>
        <div className="header-top">
          <div
            className="title"
            onClick={() => {
              if (isTopMenuOpen) {
                toggleMenuTop();
              }
              if (isFloatingMenuOpen) {
                toggleFloatingMenu();
              }
              // 검색 상태 및 쿼리 초기화
              setIsSearchActive(false);
              onSearch({ query: '', category: '' });
              setQuery('');
              setSearchParams({}, { replace: true });
              navigate({ pathname: '/' });
            }}
          >
            🏠 증권사 레포트 리스트
          </div>
          {isMobile && (
            <div className="company-select-wrapper">
              <CompanySelect
                value={query}
                onChange={handleCompanyChange}
                className="nav-button company-select"
              />
            </div>
          )}
          <div className="hamburger-menu" onClick={toggleMenuTop}>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>

        <div className="header-nav">
          <button
            className={`nav-button ${isRecent && !isSearchActive && !isCompany && !isFavorites ? 'active' : ''}`}
            onClick={() => handleButtonClick('recent')}
          >
            최근
          </button>
          <button
            className={`nav-button ${isGlobal && !isSearchActive ? 'active' : ''}`}
            onClick={() => handleButtonClick('global')}
          >
            글로벌
          </button>
          <button
            className={`nav-button ${isIndustry && !isSearchActive ? 'active' : ''}`}
            onClick={() => handleButtonClick('industry')}
          >
            산업
          </button>
          <button
            className={`nav-button ${isSearchActive ? 'active' : ''}`}
            onClick={() => handleButtonClick('search')}
          >
            검색
          </button>
          <button
            className={`nav-button ${isFavorites && !isSearchActive ? 'active' : ''}`}
            onClick={() => handleButtonClick('favorites')}
          >
            ★
          </button>
          {!isMobile && (
      </header>

      <HamburgerMenu
        isOpen={isTopMenuOpen}
        toggleMenu={toggleMenuTop}
        selectedCompany={query}
        handleCompanyChange={handleCompanyChange}
        handleHeaderClick={handleButtonClick}
      />
    </>
  );
});

export default Header;

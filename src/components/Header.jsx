import React, { useState, useEffect, forwardRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import HamburgerMenu from './HamburgerMenu';
import CompanySelect from './CompanySelect';
import { useReport } from '../context/ReportContext';
import './Header.css';

const Header = forwardRef(({ isNavVisible }, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1023);

  const { 
    toggleSearch, 
    isTopMenuOpen, 
    toggleMenuTop, 
    isMenuOpen, 
    toggleMenu, 
    handleSearch,
    setSortBy
  } = useReport();

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

  const handleButtonClick = (buttonName) => {
    if (isTopMenuOpen) toggleMenuTop();
    if (isMenuOpen) toggleMenu();
    
    if (buttonName !== 'search') {
      handleSearch({ query: '', category: '' });
      setIsSearchActive(false);
    } else {
      setIsSearchActive(true);
    }
    
    if (buttonName === 'recent') {
      setSortBy('time');
    }

    if (buttonName !== 'search') {
      setQuery('');
      setSearchParams({}, { replace: true });
    }

    const PATH_MAP = {
      recent: '/',
      global: '/global',
      industry: '/industry',
      favorites: '/favorites',
      search: '/'
    };

    const targetPath = PATH_MAP[buttonName];
    if (targetPath && buttonName !== 'search') {
      navigate({ pathname: targetPath });
    }

    if (buttonName === 'search') {
      setQuery('');
      toggleSearch();
    }
  };

  const handleCompanyChange = (e) => {
    const selectedValue = e.target.value;

    setQuery(selectedValue);
    setIsSearchActive(true);
    setSortBy('time');

    if (selectedValue) {
      setSearchParams({ q: selectedValue, category: 'company' }, { replace: true });
      handleSearch({ query: selectedValue, category: 'company' });
    } else {
      setSearchParams({}, { replace: true });
      handleSearch({ query: '', category: 'company' });
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

  const handleTitleClick = () => {
    if (isTopMenuOpen) toggleMenuTop();
    if (isMenuOpen) toggleMenu();
    setIsSearchActive(false);
    handleSearch({ query: '', category: '' });
    setQuery('');
    setSearchParams({}, { replace: true });
    setSortBy('time');
    navigate({ pathname: '/' });
  };

  return (
    <>
      <header ref={ref} className={!isNavVisible ? 'nav-hidden' : ''}>
        <div className="header-top">
          <div className="title" onClick={handleTitleClick}>
            🏠 ssh-reports-hub
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
            <div className="company-select-wrapper">
              <CompanySelect
                value={query}
                onChange={handleCompanyChange}
                className="nav-button company-select"
              />
            </div>
          )}
        </div>
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

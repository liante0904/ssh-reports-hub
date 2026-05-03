import React, { useState, useEffect, forwardRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import HamburgerMenu from './HamburgerMenu';
import CompanySelect from './CompanySelect';
import BoardSelect from './BoardSelect';
import { useReport } from '../context/useReport';
import { HEADER_PATHS, resetHeaderSearch } from '../utils/headerNavigation';
import {
  buildSearchParams,
  createClearedSearch,
  createCompanySearch,
  getSelectedCompanyOrder,
  parseSearchParams,
  toggleBoardSearch,
} from '../utils/searchSelection';
import './Header.css';

const Header = forwardRef(({ isNavVisible }, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const {
    toggleSearch, 
    isTopMenuOpen, 
    toggleMenuTop, 
    isMenuOpen, 
    toggleMenu, 
    handleSearch,
    setSortBy,
    boards,
    activeSearch
  } = useReport();

  const isRecent = location.pathname === '/';
  const isGlobal = location.pathname.includes('global');
  const isIndustry = location.pathname.includes('industry');
  const isFavorites = location.pathname.includes('favorites');
  const isCompany = location.pathname.startsWith('/company');
  const showBoardSelect = activeSearch.category === 'company' && boards.length > 0;
  const selectedCompanyOrder = getSelectedCompanyOrder(activeSearch, query);

  const syncSearchParams = (nextSearch) => {
    setSearchParams(buildSearchParams(nextSearch), { replace: true });
  };

  const handleButtonClick = (buttonName) => {
    if (isTopMenuOpen) toggleMenuTop();
    if (isMenuOpen) toggleMenu();
    
    if (buttonName !== 'search') {
      resetHeaderSearch({
        setIsSearchActive,
        handleSearch,
        setQuery,
        setSearchParams,
        setSortBy,
      });
    }

    if (buttonName === 'recent') {
      setSortBy('time');
    }

    const targetPath = HEADER_PATHS[buttonName];
    if (targetPath && buttonName !== 'search') {
      navigate({ pathname: targetPath });
    }

    if (buttonName === 'search') {
      setIsSearchActive(true);
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
      const nextSearch = createCompanySearch(selectedValue);
      syncSearchParams(nextSearch);
      handleSearch(nextSearch);
    } else {
      setSearchParams({}, { replace: true });
      handleSearch(createClearedSearch());
    }

    navigate({ pathname: '/' });
  };

  const handleBoardClick = (boardOrder) => {
    const nextSearch = toggleBoardSearch(activeSearch, boardOrder);
    handleSearch(nextSearch);
    syncSearchParams(nextSearch);
  };

  const handleBoardChange = (e) => {
    const selectedValue = e.target.value;
    handleBoardClick(selectedValue === '' ? null : Number(selectedValue));
  };

  useEffect(() => {
    const urlSearch = parseSearchParams(searchParams);
    if (urlSearch.category === 'company') {
      setQuery(urlSearch.companyOrder ?? urlSearch.query);
      setIsSearchActive(true);
      handleSearch(urlSearch);
    } else {
      setQuery('');
    }
  }, [handleSearch, searchParams]);

  const handleTitleClick = () => {
    if (isTopMenuOpen) toggleMenuTop();
    if (isMenuOpen) toggleMenu();
    setIsSearchActive(false);
    handleSearch(createClearedSearch());
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
          <div className="header-actions">
            <div className="hamburger-menu" onClick={toggleMenuTop}>
              <div></div>
              <div></div>
              <div></div>
            </div>
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
          <div className="company-select-wrapper header-nav-filters">
            <CompanySelect
              value={selectedCompanyOrder}
              onChange={handleCompanyChange}
              className="company-select"
            />
            {showBoardSelect && (
              <BoardSelect
                value={activeSearch.board}
                boards={boards}
                onChange={handleBoardChange}
                className="board-select"
              />
            )}
          </div>
        </div>
      </header>

      <HamburgerMenu
        isOpen={isTopMenuOpen}
        toggleMenu={toggleMenuTop}
        selectedCompany={selectedCompanyOrder}
        handleCompanyChange={handleCompanyChange}
        handleHeaderClick={handleButtonClick}
      />
    </>
  );
});

export default Header;

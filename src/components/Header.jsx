import React, { useState, useEffect, forwardRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import HamburgerMenu from './HamburgerMenu';
import CompanySelect from './CompanySelect';
import BoardSelect from './BoardSelect';
import { useReport } from '../context/useReport';
import { HEADER_PATHS, resetHeaderSearch } from '../utils/headerNavigation';
import { createClearedSearch, createCompanySearch, toggleBoardSearch } from '../utils/searchSelection';
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
  const selectedCompanyOrder = activeSearch.category === 'company'
    ? (activeSearch.companyOrder ?? activeSearch.query ?? query)
    : query;

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
      setSearchParams({ q: selectedValue, category: 'company' }, { replace: true });
      handleSearch(createCompanySearch(selectedValue));
    } else {
      setSearchParams({}, { replace: true });
      handleSearch(createClearedSearch());
    }

    navigate({ pathname: '/' });
  };

  const handleBoardClick = (boardOrder) => {
    const nextSearch = toggleBoardSearch(activeSearch, boardOrder);
    handleSearch(nextSearch);

    if (nextSearch.board !== null) {
      setSearchParams(
        {
          q: nextSearch.companyOrder ?? nextSearch.query,
          category: 'company',
          board: nextSearch.board.toString()
        },
        { replace: true }
      );
    } else {
      setSearchParams(
        { q: nextSearch.companyOrder ?? nextSearch.query, category: 'company' },
        { replace: true }
      );
    }
  };

  const handleBoardChange = (e) => {
    const selectedValue = e.target.value;
    handleBoardClick(selectedValue === '' ? null : Number(selectedValue));
  };

  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    const urlCategory = searchParams.get('category') || '';
    const urlBoard = searchParams.get('board');
    if (urlCategory === 'company') {
      setQuery(urlQuery);
      setIsSearchActive(true);
      handleSearch({
        query: urlQuery,
        category: 'company',
        board: urlBoard ? Number(urlBoard) : null,
        companyOrder: urlQuery || null,
      });
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

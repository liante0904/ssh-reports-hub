import React, { forwardRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import HamburgerMenu from './HamburgerMenu';
import CompanySelect from './CompanySelect';
import BoardSelect from './BoardSelect';
import { useReport } from '../context/useReport';
import { HEADER_PATHS } from '../utils/headerNavigation';
import { useHeaderSearchState } from '../hooks/useHeaderSearchState';
import './Header.css';

const Header = forwardRef(({ isNavVisible }, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    toggleSearch, 
    isTopMenuOpen, 
    toggleMenuTop, 
    isMenuOpen, 
    toggleMenu, 
    handleSearch,
    setSortBy,
    boards,
    activeSearch,
    telegramUser,
  } = useReport();

  const {
    clearSearchState,
    handleBoardChange,
    handleCompanyChange,
    handleSearchButtonClick,
    handleTitleClick,
    isSearchActive,
    selectedCompanyOrder,
    showBoardSelect,
  } = useHeaderSearchState({
    activeSearch,
    boards,
    handleSearch,
    navigate,
    searchParams,
    setSearchParams,
    setSortBy,
    toggleSearch,
  });

  const isRecent = location.pathname === '/';
  const isGlobal = location.pathname.includes('global');
  const isIndustry = location.pathname.includes('industry');
  const isFavorites = location.pathname.includes('favorites');
  const isAiSummary = location.pathname.includes('ai-summary');
  const isCompany = location.pathname.startsWith('/company');

  const isAdminConsole = location.pathname.includes('admin-console');

  const renderTelegramBadge = () => {
    if (telegramUser) {
      return (
        <span className="tg-badge tg-badge-on" title={`텔레그램 로그인: ${telegramUser.first_name} (ID:${telegramUser.id})`}>
          <span className="tg-badge-icon">✈️</span>
          <span className="tg-badge-name">{telegramUser.first_name}</span>
        </span>
      );
    }
    return (
      <span
        className="tg-badge tg-badge-off"
        title="텔레그램 로그인이 필요합니다 (클릭 시 메뉴 열기)"
        onClick={toggleMenuTop}
      >
        <span className="tg-badge-icon">✈️</span>
        <span className="tg-badge-name">로그인</span>
      </span>
    );
  };

  const renderAdminConsoleBtn = () => {
    if (!telegramUser?.is_admin) return null;
    const isActive = isAdminConsole && !isSearchActive;
    return (
      <button
        className={`nav-button ${isActive ? 'active' : ''}`}
        onClick={() => {
          if (isTopMenuOpen) toggleMenuTop();
          if (isMenuOpen) toggleMenu();
          navigate('/admin-console');
        }}
      >
        🛠️ 콘솔
      </button>
    );
  };

  const handleButtonClick = (buttonName) => {
    if (isTopMenuOpen) toggleMenuTop();
    if (isMenuOpen) toggleMenu();
    
    if (buttonName !== 'search') {
      clearSearchState({ navigateHome: false });
    }

    if (buttonName === 'recent') {
      setSortBy('time');
    }

    const targetPath = HEADER_PATHS[buttonName];
    if (targetPath && buttonName !== 'search') {
      navigate({ pathname: targetPath });
    }

    if (buttonName === 'search') {
      handleSearchButtonClick();
    }
  };

  return (
    <>
      <header ref={ref} className={!isNavVisible ? 'nav-hidden' : ''}>
        <div className="header-top">
          <div className="title" onClick={handleTitleClick}>
            🏠 ssh-reports-hub
          </div>
          <div className="header-actions">
            {renderTelegramBadge()}
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
          <button
            className={`nav-button ${isAiSummary && !isSearchActive ? 'active' : ''}`}
            onClick={() => handleButtonClick('ai_summary')}
          >
            AI요약
          </button>
          {renderAdminConsoleBtn()}
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

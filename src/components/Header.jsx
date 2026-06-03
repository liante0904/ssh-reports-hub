import React, { forwardRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HamburgerMenu from './HamburgerMenu';
import { useReport } from '../context/useReport';
import { HEADER_PATHS } from '../utils/headerNavigation';
import { useHeaderSearchState } from '../hooks/useHeaderSearchState';
import { useTelegramAuth } from '../hooks/useTelegramAuth';
import './Header.css';

const Header = forwardRef(({ isNavVisible }, ref) => {
  const navigate = useNavigate();
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
  const { isAuthenticating, loginWithTelegram } = useTelegramAuth();

  const {
    clearSearchState,
    handleCompanyChange,
    handleSearchButtonClick,
    selectedCompanyOrder,
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

  const renderTelegramBadge = () => {
    if (telegramUser) {
      return (
        <button
          type="button"
          className="tg-badge tg-badge-on"
          title={`텔레그램 로그인: ${telegramUser.first_name} (ID:${telegramUser.id})`}
          onClick={toggleMenuTop}
        >
          <span className="tg-badge-icon">✈️</span>
          <span className="tg-badge-name">{telegramUser.first_name}</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        className="tg-badge tg-badge-off"
        title="텔레그램 브라우저 로그인"
        onClick={loginWithTelegram}
        disabled={isAuthenticating}
      >
        <span className="tg-badge-icon">✈️</span>
        <span className="tg-badge-name">{isAuthenticating ? '인증 중' : '로그인'}</span>
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
          <div className="title" onClick={() => handleButtonClick('home')}>
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

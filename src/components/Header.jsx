import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HamburgerMenu from './HamburgerMenu';
import KeywordOverlay from './menu/KeywordOverlay';
import { AccountPopover, BellIcon, NotificationPopover } from './HeaderPopovers';
import { useReport } from '../context/useReport';
import { HEADER_PATHS } from '../utils/headerNavigation';
import { useHeaderSearchState } from '../hooks/useHeaderSearchState';
import { useKeywords } from '../hooks/useKeywords';
import { useTelegramAuth } from '../hooks/useTelegramAuth';
import './Header.css';

const Header = forwardRef(({ isNavVisible }, ref) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activePopover, setActivePopover] = useState(null);

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
    logout,
  } = useReport();
  const { isAuthenticating, loginWithTelegram } = useTelegramAuth();
  const keywordState = useKeywords(telegramUser);

  const {
    clearSearchState,
    handleCompanyChange,
    handleBoardChange,
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
          onClick={() => setActivePopover((current) => current === 'account' ? null : 'account')}
          aria-expanded={activePopover === 'account'}
          aria-haspopup="dialog"
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

  const closePopover = useCallback(() => setActivePopover(null), []);

  const handleOpenKeywordSettings = () => {
    setActivePopover(null);
    if (!telegramUser) {
      loginWithTelegram();
      return;
    }
    keywordState.openKeywordOverlay();
  };

  const handleNotificationClick = () => {
    setActivePopover((current) => current === 'notifications' ? null : 'notifications');
  };

  useEffect(() => {
    if (isTopMenuOpen || !isNavVisible) {
      setActivePopover(null);
    }
  }, [isNavVisible, isTopMenuOpen]);

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
            <button
              type="button"
              className="header-notification-button"
              onClick={handleNotificationClick}
              title="리포트 알림"
              aria-label="리포트 알림"
              aria-expanded={activePopover === 'notifications'}
              aria-haspopup="dialog"
            >
              <BellIcon />
            </button>
            <button type="button" className="hamburger-menu" onClick={toggleMenuTop} title="메뉴" aria-label="메뉴 열기">
              <div></div>
              <div></div>
              <div></div>
            </button>
          </div>
        </div>
      </header>

      {activePopover === 'notifications' && (
        <NotificationPopover
          telegramUser={telegramUser}
          keywords={keywordState.keywords}
          isLoadingKeywords={keywordState.isLoadingKeywords}
          onClose={closePopover}
          onOpenSettings={handleOpenKeywordSettings}
          onLogin={loginWithTelegram}
          isAuthenticating={isAuthenticating}
        />
      )}

      {activePopover === 'account' && (
        <AccountPopover
          telegramUser={telegramUser}
          onClose={closePopover}
          onOpenSettings={handleOpenKeywordSettings}
          onLogout={logout}
        />
      )}

      <HamburgerMenu
        isOpen={isTopMenuOpen}
        toggleMenu={toggleMenuTop}
        selectedCompany={selectedCompanyOrder}
        handleCompanyChange={handleCompanyChange}
        handleHeaderClick={handleButtonClick}
        boards={boards}
        selectedBoard={activeSearch.board}
        handleBoardChange={handleBoardChange}
        keywordState={keywordState}
      />

      {keywordState.isKeywordOverlayOpen && createPortal(
        <KeywordOverlay
          newKeyword={keywordState.newKeyword}
          setNewKeyword={keywordState.setNewKeyword}
          handleAddKeyword={keywordState.handleAddKeyword}
          handleDeleteKeyword={keywordState.handleDeleteKeyword}
          handleDeleteAllKeywords={keywordState.handleDeleteAllKeywords}
          handleUndoDelete={keywordState.handleUndoDelete}
          keywords={keywordState.keywords}
          isLoadingKeywords={keywordState.isLoadingKeywords}
          lastDeleted={keywordState.lastDeleted}
          toggleKeywordOverlay={keywordState.closeKeywordOverlay}
        />,
        document.body
      )}
    </>
  );
});

export default Header;

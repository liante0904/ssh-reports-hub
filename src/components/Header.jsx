import React, { forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HamburgerMenu from './HamburgerMenu';
import KeywordOverlay from './menu/KeywordOverlay';
import { useReport } from '../context/useReport';
import { HEADER_PATHS } from '../utils/headerNavigation';
import { useHeaderSearchState } from '../hooks/useHeaderSearchState';
import { useTelegramAuth } from '../hooks/useTelegramAuth';
import { useKeywords } from '../hooks/useKeywords';
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
    logout,
  } = useReport();
  const { isAuthenticating, loginWithTelegram } = useTelegramAuth();
  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'ebest_noti_bot';
  const {
    keywords,
    newKeyword,
    setNewKeyword,
    isLoadingKeywords,
    isKeywordOverlayOpen,
    lastDeleted,
    handleAddKeyword,
    handleDeleteKeyword,
    handleDeleteAllKeywords,
    handleUndoDelete,
    toggleKeywordOverlay,
  } = useKeywords(telegramUser);

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
        <>
          <span
            className="tg-badge tg-badge-on"
            title={`텔레그램 로그인: ${telegramUser.first_name} (ID:${telegramUser.id})`}
          >
            <span className="tg-badge-icon">✈️</span>
            <span className="tg-badge-name">{telegramUser.first_name}</span>
          </span>
          <button type="button" className="header-mini-action logout" onClick={logout} title="로그아웃">
            로그아웃
          </button>
          <a
            className="header-icon-action"
            href={`https://t.me/${botName}?start=${telegramUser.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="레포트 알림"
          >
            🔔
          </a>
          <button
            type="button"
            className="header-icon-action"
            onClick={toggleKeywordOverlay}
            title="키워드 설정"
          >
            ⚙️
          </button>
        </>
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
        boards={boards}
        selectedBoard={activeSearch.board}
        handleBoardChange={handleBoardChange}
      />
      {isKeywordOverlayOpen && createPortal(
        <KeywordOverlay
          newKeyword={newKeyword}
          setNewKeyword={setNewKeyword}
          handleAddKeyword={handleAddKeyword}
          handleDeleteKeyword={handleDeleteKeyword}
          handleDeleteAllKeywords={handleDeleteAllKeywords}
          handleUndoDelete={handleUndoDelete}
          keywords={keywords}
          isLoadingKeywords={isLoadingKeywords}
          lastDeleted={lastDeleted}
          toggleKeywordOverlay={toggleKeywordOverlay}
        />,
        document.body
      )}
    </>
  );
});

export default Header;

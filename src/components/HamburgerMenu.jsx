import React from 'react';
import { createPortal } from 'react-dom';
import CompanySelect from './CompanySelect';
import TelegramAuth from './menu/TelegramAuth';
import KeywordOverlay from './menu/KeywordOverlay';
import AdminSection from './menu/AdminSection';
import { useKeywords } from '../hooks/useKeywords';
import { useTelegramAuth } from '../hooks/useTelegramAuth';
import { useReport } from '../context/useReport';
import './HamburgerMenu.css';

function HamburgerMenu({ isOpen, toggleMenu, selectedCompany, handleCompanyChange, handleHeaderClick }) {
  const { telegramUser, logout } = useReport();
  const {
    isAuthenticating,
    loginWithTelegram,
    loginWithTelegramApp,
    loginWithDevBypass,
  } = useTelegramAuth();

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
    toggleKeywordOverlay
  } = useKeywords(telegramUser);

  const handleSelectChange = (e) => {
    handleCompanyChange(e);
    toggleMenu();
  };

  return (
    <>
      {isOpen && (
        <div className={`menu-overlay ${isOpen ? 'open' : ''}`} onClick={toggleMenu}>
          <div className={`menu-panel ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="menu-title">메뉴</div>
            <a className="menu-item" onClick={() => handleHeaderClick('home')}><span className="icon">🏠</span> 홈</a>
            <a className="menu-item" onClick={() => handleHeaderClick('recent')}><span className="icon">🏠</span> 최근 레포트</a>
            <a className="menu-item" onClick={() => handleHeaderClick('global')}><span className="icon">🌍</span> 글로벌 레포트</a>
            <a className="menu-item" onClick={() => handleHeaderClick('industry')}><span className="icon">🏭</span> 산업 레포트</a>
            <a className="menu-item" onClick={() => handleHeaderClick('outlook')}><span className="icon">🔮</span> 전망 레포트</a>
            <a className="menu-item" onClick={() => handleHeaderClick('ai_summary')}><span className="icon">🤖</span> AI요약</a>
            <a className="menu-item" onClick={() => handleHeaderClick('fnguide')}><span className="icon">📄</span> 종목요약</a>

            <div className="menu-item-select">
              <CompanySelect value={selectedCompany} onChange={handleSelectChange} className="company-select" />
            </div>

            <div className="menu-title">알림 & 즐겨찾기</div>
            <TelegramAuth
              telegramUser={telegramUser}
              isAuthenticating={isAuthenticating}
              loginWithTelegram={loginWithTelegram}
              loginWithTelegramApp={loginWithTelegramApp}
              loginWithDevBypass={loginWithDevBypass}
              handleLogout={logout}
              toggleKeywordOverlay={toggleKeywordOverlay}
            />

            <AdminSection isAdmin={telegramUser?.is_admin} />
          </div>
        </div>
      )}
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
}

export default HamburgerMenu;

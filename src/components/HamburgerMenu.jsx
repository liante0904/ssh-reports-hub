import React from 'react';
import { createPortal } from 'react-dom';
import CompanySelect from './CompanySelect';
import BoardSelect from './BoardSelect';
import TelegramAuth from './menu/TelegramAuth';
import KeywordOverlay from './menu/KeywordOverlay';
import AdminSection from './menu/AdminSection';
import { useKeywords } from '../hooks/useKeywords';
import { useTelegramAuth } from '../hooks/useTelegramAuth';
import { useReport } from '../context/useReport';
import './HamburgerMenu.css';

function HamburgerMenu({
  isOpen,
  toggleMenu,
  selectedCompany,
  handleCompanyChange,
  handleHeaderClick,
  boards = [],
  selectedBoard,
  handleBoardChange,
}) {
  const { telegramUser, logout, theme, toggleTheme } = useReport();
  const {
    isAuthenticating,
    loginWithTelegram,
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
    openKeywordOverlay,
    closeKeywordOverlay
  } = useKeywords(telegramUser);

  const handleSelectChange = (e) => {
    handleCompanyChange(e);
    toggleMenu();
  };

  const menuItems = [
    { key: 'home', icon: '🏠', label: '홈', desc: '오늘의 흐름' },
    { key: 'recent', icon: '🕘', label: '최근', desc: '최신 리포트' },
    { key: 'fnguide', icon: '📄', label: '종목요약', desc: 'FnGuide 요약' },
    { key: 'ai_summary', icon: '🤖', label: 'AI요약', desc: '요약 리포트' },
    { key: 'industry', icon: '🏭', label: '산업', desc: '섹터 리포트' },
    { key: 'global', icon: '🌍', label: '글로벌', desc: '해외 리서치' },
    { key: 'outlook', icon: '🔮', label: '전망', desc: '전략/전망' },
    { key: 'favorites', icon: '⭐', label: '즐겨찾기', desc: '저장한 항목' },
  ];

  const handleMenuItemClick = (key) => {
    handleHeaderClick(key);
  };

  const handleOpenKeywordOverlay = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    openKeywordOverlay();
  };

  return (
    <>
      {isOpen && (
        <div className={`menu-overlay ${isOpen ? 'open' : ''}`} onClick={toggleMenu}>
          <div className={`menu-panel ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="menu-panel-header">
              <div>
                <div className="menu-eyebrow">Reports Hub</div>
                <h2>메뉴</h2>
              </div>
              <button type="button" className="menu-close-btn" onClick={toggleMenu} title="닫기">×</button>
            </div>

            <section className="menu-section account-section">
              <div className="menu-section-title">내 계정</div>
              <TelegramAuth
                telegramUser={telegramUser}
                isAuthenticating={isAuthenticating}
                loginWithTelegram={loginWithTelegram}
                loginWithDevBypass={loginWithDevBypass}
                handleLogout={logout}
                toggleKeywordOverlay={handleOpenKeywordOverlay}
              />
            </section>

            <section className="menu-section">
              <div className="menu-section-title">빠른 이동</div>
              <div className="menu-grid">
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="menu-card"
                    onClick={() => handleMenuItemClick(item.key)}
                  >
                    <span className="menu-card-icon">{item.icon}</span>
                    <span className="menu-card-text">
                      <strong>{item.label}</strong>
                      <small>{item.desc}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="menu-section">
              <div className="menu-section-title">증권사 필터</div>
              <div className="menu-item-select">
                <CompanySelect value={selectedCompany} onChange={handleSelectChange} className="company-select" />
              </div>
              {selectedCompany && boards.length > 0 && (
                <div className="menu-item-select">
                  <BoardSelect
                    value={selectedBoard}
                    boards={boards}
                    onChange={(e) => {
                      handleBoardChange(e);
                      toggleMenu();
                    }}
                    className="board-select"
                  />
                </div>
              )}
            </section>

            <section className="menu-section">
              <div className="menu-section-title">설정</div>
              <div className="menu-setting-list">
                <button type="button" className="menu-setting-row" onClick={toggleTheme}>
                  <span className="menu-setting-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
                  <span>
                    <strong>화면 모드</strong>
                    <small>{theme === 'light' ? '다크모드로 전환' : '라이트모드로 전환'}</small>
                  </span>
                </button>
                <button type="button" className="menu-setting-row" onClick={handleOpenKeywordOverlay}>
                  <span className="menu-setting-icon">🔔</span>
                  <span>
                    <strong>리포트 알림</strong>
                    <small>키워드와 텔레그램 알림 관리</small>
                  </span>
                </button>
              </div>
            </section>

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
          toggleKeywordOverlay={closeKeywordOverlay}
        />,
        document.body
      )}
    </>
  );
}

export default HamburgerMenu;

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import CompanySelect from './CompanySelect';
import TelegramAuth from './menu/TelegramAuth';
import KeywordOverlay from './menu/KeywordOverlay';
import AdminSection from './menu/AdminSection';
import { useKeywords } from '../hooks/useKeywords';
import { useReport } from '../context/ReportContext';
import './HamburgerMenu.css';

function HamburgerMenu({ isOpen, toggleMenu, selectedCompany, handleCompanyChange, handleHeaderClick }) {
  const { logout } = useReport();
  const [telegramUser, setTelegramUser] = useState(() => {
    const saved = localStorage.getItem('telegram_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

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

  const getApiConfig = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://ssh-oci.duckdns.org';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return { cleanBaseUrl };
  };

  const loginWithTelegram = () => {
    if (!window.Telegram || !window.Telegram.Login) {
      alert('텔레그램 스크립트가 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const botId = import.meta.env.VITE_TELEGRAM_BOT_ID || '1372612160';
    if (!botId) return;

    window.Telegram.Login.auth(
      { bot_id: botId, request_access: 'write', embed: 1 },
      async (user) => {
        if (user) {
          setIsAuthenticating(true);
          try {
            const { cleanBaseUrl } = getApiConfig();
            const response = await fetch(`${cleanBaseUrl}/auth/telegram`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(user),
            });

            if (response.ok) {
              const result = await response.json();
              if (result.access_token) {
                localStorage.setItem('auth_token', result.access_token);
              }
              const userData = { ...user, ...result.user };
              setTelegramUser(userData);
              localStorage.setItem('telegram_user', JSON.stringify(userData));
            }
          } catch (error) {
            console.error('로그인 에러:', error);
          } finally {
            setIsAuthenticating(false);
          }
        }
      }
    );
  };

  const loginWithTelegramApp = () => {
    const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'ebest_noti_bot';
    const startParam = telegramUser ? `?start=${telegramUser.id}` : '';
    window.open(`https://t.me/${botName}${startParam}`, '_blank');
  };

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
            <a className="menu-item" onClick={() => handleHeaderClick('recent')}><span className="icon">🏠</span> 최근 레포트</a>
            <a className="menu-item" onClick={() => handleHeaderClick('global')}><span className="icon">🌍</span> 글로벌 레포트</a>
            <a className="menu-item" onClick={() => handleHeaderClick('industry')}><span className="icon">🏭</span> 산업 레포트</a>

            <div className="menu-item-select">
              <CompanySelect value={selectedCompany} onChange={handleSelectChange} />
            </div>

            <div className="menu-title">알림 & 즐겨찾기</div>
            <TelegramAuth 
              telegramUser={telegramUser}
              isAuthenticating={isAuthenticating}
              loginWithTelegram={loginWithTelegram}
              loginWithTelegramApp={loginWithTelegramApp}
              handleLogout={logout}
              toggleKeywordOverlay={toggleKeywordOverlay}
            />

            <AdminSection />
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

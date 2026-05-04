import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import CompanySelect from './CompanySelect';
import TelegramAuth from './menu/TelegramAuth';
import KeywordOverlay from './menu/KeywordOverlay';
import AdminSection from './menu/AdminSection';
import { useKeywords } from '../hooks/useKeywords';
import { useReport } from '../context/useReport';
import { CONFIG } from '../constants/config';
import { request } from '../utils/api';
import { createDevTelegramUser, persistTelegramUser } from '../utils/devAuth';
import './HamburgerMenu.css';

function HamburgerMenu({ isOpen, toggleMenu, selectedCompany, handleCompanyChange, handleHeaderClick }) {
  const { logout } = useReport();
  const [telegramUser, setTelegramUser] = useState(() => {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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

  const extractAuthToken = (result) => {
    if (!result || typeof result !== 'object') return null;
    return result.access_token || result.token || result.auth_token || result.jwt || null;
  };

  const loginWithTelegram = () => {
    if (!window.Telegram || !window.Telegram.Login) {
      alert('텔레그램 스크립트가 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const botId = CONFIG.TELEGRAM.BOT_ID;
    if (!botId) return;

    window.Telegram.Login.auth(
      { bot_id: botId, request_access: 'write', embed: 1 },
      async (user) => {
        if (user) {
          setIsAuthenticating(true);
          try {
            const baseUrl = CONFIG.API.BASE_URL;
            const result = await request(`${baseUrl}/auth/telegram`, {
              method: 'POST',
              body: JSON.stringify(user),
            });

            if (result) {
              const authToken = extractAuthToken(result);
              if (authToken) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, authToken);
              } else {
                console.warn('[Telegram Auth] Auth response did not include a token field.', result);
              }
              const userData = { ...user, ...(result.user || {}) };
              setTelegramUser(userData);
              localStorage.setItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER, JSON.stringify(userData));
            }
          } catch {
            // 로깅됨
          } finally {
            setIsAuthenticating(false);
          }
        }
      }
    );
  };

  const loginWithDevBypass = () => {
    const devUser = createDevTelegramUser();
    setTelegramUser(devUser);
    persistTelegramUser(devUser);
  };

  const loginWithTelegramApp = () => {
    const startParam = telegramUser ? telegramUser.id : '';
    window.open(CONFIG.TELEGRAM.getAuthUrl(startParam), '_blank');
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

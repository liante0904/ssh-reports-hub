import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import CompanySelect from './CompanySelect';
import TelegramAuth from './menu/TelegramAuth';
import KeywordOverlay from './menu/KeywordOverlay';
import AdminSection from './menu/AdminSection';
import './HamburgerMenu.css';

function HamburgerMenu({ isOpen, toggleMenu, selectedCompany, handleCompanyChange, handleHeaderClick }) {
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
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [isKeywordOverlayOpen, setIsKeywordOverlayOpen] = useState(false);
  const [lastDeleted, setLastDeleted] = useState(null);

  const getApiConfig = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://ssh-oci.duckdns.org';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const token = localStorage.getItem('auth_token');
    return { cleanBaseUrl, token };
  };

  const fetchKeywords = async () => {
    const { cleanBaseUrl, token } = getApiConfig();
    if (!token) return;

    setIsLoadingKeywords(true);
    try {
      const response = await fetch(`${cleanBaseUrl}/keywords`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setKeywords(data.filter(k => k.is_active));
      }
    } catch (error) {
      console.error('❌ 키워드 조회 실패:', error);
    } finally {
      setIsLoadingKeywords(false);
    }
  };

  const syncKeywords = async (updatedKeywords) => {
    const { cleanBaseUrl, token } = getApiConfig();
    if (!token) return;

    try {
      const response = await fetch(`${cleanBaseUrl}/keywords/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ keywords: updatedKeywords })
      });

      if (response.ok) {
        const data = await response.json();
        setKeywords(data.filter(k => k.is_active));
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('❌ 키워드 동기화 실패:', error);
    }
  };

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    
    if (keywords.some(k => k.keyword === trimmed)) {
      setNewKeyword('');
      return;
    }

    const nextKeywords = [...keywords.map(k => k.keyword), trimmed];
    setNewKeyword('');
    syncKeywords(nextKeywords);
  };

  const handleDeleteKeyword = (keywordToDelete) => {
    const nextKeywords = keywords
      .filter(k => k.keyword !== keywordToDelete)
      .map(k => k.keyword);
    
    setLastDeleted({ type: 'single', data: [keywordToDelete] });
    syncKeywords(nextKeywords);
  };

  const handleDeleteAllKeywords = () => {
    if (keywords.length === 0) return;
    if (!window.confirm('정말로 모든 키워드를 삭제하시겠습니까?')) return;

    const currentKeywords = keywords.map(k => k.keyword);
    setLastDeleted({ type: 'bulk', data: currentKeywords });
    syncKeywords([]);
  };

  const handleUndoDelete = () => {
    if (!lastDeleted) return;

    const currentKeywordList = keywords.map(k => k.keyword);
    const restoredKeywords = [...new Set([...currentKeywordList, ...lastDeleted.data])];
    
    syncKeywords(restoredKeywords);
    setLastDeleted(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('telegram_user');
    setTelegramUser(null);
    setKeywords([]);
    setIsKeywordOverlayOpen(false);
    setIsPolling(false);
  };

  useEffect(() => {
    if (telegramUser) {
      fetchKeywords();
    }
  }, [telegramUser]);

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

  const toggleKeywordOverlay = () => {
    setIsKeywordOverlayOpen(!isKeywordOverlayOpen);
    setLastDeleted(null);
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
              handleLogout={handleLogout}
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

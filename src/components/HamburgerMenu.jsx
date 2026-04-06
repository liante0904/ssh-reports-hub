import React, { useState, useEffect } from 'react';
import CompanySelect from './CompanySelect'; // CompanySelect 임포트
import './HamburgerMenu.css';

function HamburgerMenu({ isOpen, toggleMenu, selectedCompany, handleCompanyChange, handleHeaderClick }) {
  const [telegramUser, setTelegramUser] = useState(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);

  // API 호출 공통 설정
  const getApiConfig = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://ssh-oci.duckdns.org';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const token = localStorage.getItem('auth_token');
    return { cleanBaseUrl, token };
  };

  // 1. 텔레그램 위젯 스크립트 동적 로드
  useEffect(() => {
    if (isOpen && !isScriptLoaded) {
      const script = document.createElement('script');
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.onload = () => {
        setIsScriptLoaded(true);
      };
      document.body.appendChild(script);
    }
  }, [isOpen, isScriptLoaded]);

  // 2. 키워드 목록 조회 (GET /keywords)
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

  // 3. 키워드 추가 (POST /keywords)
  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;
    const { cleanBaseUrl, token } = getApiConfig();

    try {
      const response = await fetch(`${cleanBaseUrl}/keywords`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ keyword: newKeyword.trim() })
      });

      if (response.ok) {
        setNewKeyword('');
        fetchKeywords();
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('❌ 키워드 추가 실패:', error);
    }
  };

  // 4. 키워드 삭제 (PUT /keywords/{id} - is_active: false)
  const handleDeleteKeyword = async (id, keywordText) => {
    const { cleanBaseUrl, token } = getApiConfig();

    try {
      const response = await fetch(`${cleanBaseUrl}/keywords/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ keyword: keywordText, is_active: false })
      });

      if (response.ok) {
        fetchKeywords();
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('❌ 키워드 삭제 실패:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setTelegramUser(null);
    setKeywords([]);
  };

  // 로그인 상태가 되면 키워드 자동 로드
  useEffect(() => {
    if (telegramUser) {
      fetchKeywords();
    }
  }, [telegramUser]);

  const loginWithTelegram = () => {
    if (!window.Telegram || !window.Telegram.Login) {
      alert('텔레그램 스크립트가 로딩 중입니다.');
      return;
    }

    const botId = import.meta.env.VITE_TELEGRAM_BOT_ID;
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
              setTelegramUser({ ...user, ...result.user });
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

            <div className="menu-title">키워드 알림</div>
            <div className="telegram-section">
              {!telegramUser ? (
                <div className="telegram-auth-box">
                  <p className="telegram-desc">텔레그램 로그인 후 알림을 받으세요</p>
                  <button className="telegram-custom-login-btn" onClick={loginWithTelegram} disabled={isAuthenticating}>
                    <span className="telegram-icon">✈️</span> {isAuthenticating ? '인증 중...' : 'Telegram으로 로그인'}
                  </button>
                </div>
              ) : (
                <div className="telegram-user-card">
                  <div className="user-info-header">
                    <span className="user-name">🔔 {telegramUser.first_name}님</span>
                    <button className="logout-small-btn" onClick={handleLogout}>로그아웃</button>
                  </div>
                  
                  <div className="keyword-manager">
                    <div className="keyword-input-group">
                      <input 
                        type="text" 
                        placeholder="키워드 입력 (예: 삼성전자)" 
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                      />
                      <button onClick={handleAddKeyword}>추가</button>
                    </div>

                    <div className="keyword-list-container">
                      {isLoadingKeywords ? (
                        <p className="loading-text">로딩 중...</p>
                      ) : keywords.length > 0 ? (
                        <div className="keyword-tags">
                          {keywords.map((k) => (
                            <span key={k.id} className="keyword-tag">
                              {k.keyword}
                              <button onClick={() => handleDeleteKeyword(k.id, k.keyword)}>×</button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="empty-text">등록된 키워드가 없습니다.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="admin-section">
              <div className="menu-title admin-title">관리자 전용</div>
              <div className="admin-links-grid">
                <a className="menu-item admin-link" href={`https://${import.meta.env.VITE_VPN_ADDR}/code`} target="_blank" rel="noopener noreferrer"><span className="icon">💻</span> VSCode</a>
                <a className="menu-item admin-link" href={`https://${import.meta.env.VITE_VPN_ADDR}/explorer/`} target="_blank" rel="noopener noreferrer"><span className="icon">📂</span> Explorer</a>
                <a className="menu-item admin-link" href={`https://${import.meta.env.VITE_VPN_ADDR}/portainer/`} target="_blank" rel="noopener noreferrer"><span className="icon">🐳</span> Docker</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HamburgerMenu;

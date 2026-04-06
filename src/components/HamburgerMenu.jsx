import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import CompanySelect from './CompanySelect'; // CompanySelect 임포트
import './HamburgerMenu.css';

function HamburgerMenu({ isOpen, toggleMenu, selectedCompany, handleCompanyChange, handleHeaderClick }) {
  // 초기 상태를 localStorage에서 불러오도록 수정
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

  // API 호출 공통 설정
  const getApiConfig = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://ssh-oci.duckdns.org';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const token = localStorage.getItem('auth_token');
    return { cleanBaseUrl, token };
  };

  // 1. 초기 키워드 목록 조회 (GET /keywords)
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

  // 2. 키워드 동기화 (POST /keywords/sync)
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
        setKeywords(data.filter(k => k.is_active)); // 서버에서 받은 최신 리스트로 갱신
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('❌ 키워드 동기화 실패:', error);
    }
  };

  // 키워드 추가 핸들러
  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    
    // 중복 체크
    if (keywords.some(k => k.keyword === trimmed)) {
      setNewKeyword('');
      return;
    }

    const nextKeywords = [...keywords.map(k => k.keyword), trimmed];
    setNewKeyword('');
    syncKeywords(nextKeywords);
  };

  // 키워드 삭제 핸들러
  const handleDeleteKeyword = (keywordToDelete) => {
    const nextKeywords = keywords
      .filter(k => k.keyword !== keywordToDelete)
      .map(k => k.keyword);
    
    syncKeywords(nextKeywords);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('telegram_user');
    setTelegramUser(null);
    setKeywords([]);
    setIsKeywordOverlayOpen(false);
    setIsPolling(false);
  };

  // 로그인 상태가 되면 키워드 자동 로드
  useEffect(() => {
    if (telegramUser) {
      fetchKeywords();
    }
  }, [telegramUser]);

  // 텔레그램 위젯 방식 로그인 (브라우저용)
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

  // 텔레그램 앱 연결 방식 (단순 딥링크 - 백엔드 준비 전까지는 단순 연결용)
  const loginWithTelegramApp = () => {
    const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'ebest_noti_bot';
    // 로그인 전이라면 일반 연결, 로그인 후라면 start 파라미터 포함
    const startParam = telegramUser ? `?start=${telegramUser.id}` : '';
    window.open(`https://t.me/${botName}${startParam}`, '_blank');
  };

  /* 백엔드 API 준비 후 사용할 폴링 로직 (주석 처리)
  const loginWithTelegramAppReal = async () => {
    if (isPolling) return;
    const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'ebest_noti_bot';
    const { cleanBaseUrl } = getApiConfig();
    try {
      setIsAuthenticating(true);
      const response = await fetch(`${cleanBaseUrl}/auth/telegram/request`, { method: 'POST' });
      if (!response.ok) throw new Error('인증 요청 실패');
      const { temp_code } = await response.json();
      window.open(`https://t.me/${botName}?start=${temp_code}`, '_blank');
      startPolling(temp_code);
    } catch (error) {
      console.error('앱 로그인 요청 실패:', error);
      setIsAuthenticating(false);
    }
  };

  const startPolling = (temp_code) => {
    setIsPolling(true);
    const { cleanBaseUrl } = getApiConfig();
    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount > 60) { clearInterval(interval); setIsPolling(false); setIsAuthenticating(false); return; }
      try {
        const response = await fetch(`${cleanBaseUrl}/auth/telegram/check/${temp_code}`);
        if (response.ok) {
          const result = await response.json();
          if (result.status === 'COMPLETED') {
            clearInterval(interval);
            setIsPolling(false);
            setIsAuthenticating(false);
            if (result.access_token) localStorage.setItem('auth_token', result.access_token);
            setTelegramUser(result.user);
            localStorage.setItem('telegram_user', JSON.stringify(result.user));
          }
        }
      } catch (e) {}
    }, 2000);
  };
  */

  const handleSelectChange = (e) => {
    handleCompanyChange(e);
    toggleMenu();
  };

  const toggleKeywordOverlay = () => {
    setIsKeywordOverlayOpen(!isKeywordOverlayOpen);
  };

  // 알림 설정 오버레이 (Portal)
  const keywordOverlay = (
    <div className="grid-overlay-portal keyword-setup-overlay">
      <div className="grid-overlay-header">
        <div className="grid-header-top">
          <h3>알림 키워드 설정</h3>
          <button className="grid-close-btn" onClick={toggleKeywordOverlay}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="keyword-overlay-desc">
          관심 있는 <b>종목명(예: 삼성전자)</b>이나 <b>애널리스트 이름</b>을 등록해 보세요.<br/>
          레포트 제목이나 작성자 정보에 해당 키워드가 포함되면 즉시 알려드립니다.
        </div>
        <div className="grid-search-wrapper keyword-input-wrapper">
          <input 
            type="text" 
            placeholder="키워드 입력 (예: 삼성전자, 반도체)" 
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
          />
          <button className="keyword-add-btn" onClick={handleAddKeyword}>추가</button>
        </div>
      </div>

      <div className="grid-overlay-content">
        <div className="keyword-management-container">
          <div className="keyword-status-info">
            <span className="count-badge">등록된 키워드: {keywords.length}개</span>
          </div>
          
          <div className="keyword-large-list">
            {isLoadingKeywords ? (
              <div className="loading-spinner-container">
                <div className="spinner"></div>
                <p>로딩 중...</p>
              </div>
            ) : keywords.length > 0 ? (
              <div className="keyword-grid">
                {keywords.map((k, index) => (
                  <div key={index} className="keyword-large-tag">
                    <span className="keyword-text">{k.keyword}</span>
                    <button className="keyword-delete-btn" onClick={() => handleDeleteKeyword(k.keyword)}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="keyword-empty-state">
                <div className="empty-icon">🔔</div>
                <p>등록된 키워드가 없습니다.<br/>위에서 키워드를 추가해보세요!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

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

            <div className="menu-title">알림 서비스</div>
            <div className="telegram-section">
              {!telegramUser ? (
                <div className="telegram-auth-box">
                  <p className="telegram-desc">텔레그램 로그인 후 알림을 받으세요</p>
                  <div className="telegram-btn-group">
                    <button className="telegram-custom-login-btn" onClick={loginWithTelegram} disabled={isAuthenticating}>
                      <span className="telegram-icon">✈️</span> {isAuthenticating ? '인증 중...' : '브라우저로 로그인'}
                    </button>
                    <button className="telegram-app-login-btn" onClick={loginWithTelegramApp}>
                      <span className="telegram-icon">📲</span> 앱으로 연결
                    </button>
                  </div>
                </div>
              ) : (
                <div className="telegram-user-card">
                  <div className="user-info-header">
                    <span className="user-name">🔔 {telegramUser.first_name}님 <small style={{fontSize: '0.8em', color: '#8e8e93', fontWeight: 'normal'}}>(ID:{telegramUser.id})</small></span>
                    <button className="logout-small-btn" onClick={handleLogout}>로그아웃</button>
                  </div>

                  <button className="open-keyword-overlay-btn" onClick={toggleKeywordOverlay}>
                    <span className="icon">⚙️</span> 키워드 알림 설정하기
                  </button>

                  <div className="bot-connect-banner">
                    <a 
                      href={`https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_NAME || 'ebest_noti_bot'}?start=${telegramUser.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bot-connect-btn"
                    >
                      <span className="icon">🚀</span> 텔레그램 봇 연결하기 (필수)
                    </a>
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
      {isKeywordOverlayOpen && createPortal(keywordOverlay, document.body)}
    </>
  );
}

export default HamburgerMenu;

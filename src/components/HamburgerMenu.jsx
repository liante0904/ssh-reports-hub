import React, { useState, useEffect } from 'react';
import CompanySelect from './CompanySelect'; // CompanySelect 임포트
import './HamburgerMenu.css';

function HamburgerMenu({ isOpen, toggleMenu, selectedCompany, handleCompanyChange, handleHeaderClick }) {
  const [telegramUser, setTelegramUser] = useState(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // 1. 텔레그램 위젯 스크립트 동적 로드 (API 사용 준비)
  useEffect(() => {
    if (isOpen && !isScriptLoaded) {
      const script = document.createElement('script');
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.onload = () => {
        console.log('✅ 텔레그램 스크립트 로드 완료 (API 준비됨)');
        setIsScriptLoaded(true);
      };
      document.body.appendChild(script);
    }
  }, [isOpen, isScriptLoaded]);

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // 2. 실제 버튼 클릭 시 실행될 로그인 함수
  const loginWithTelegram = () => {
    if (!window.Telegram || !window.Telegram.Login) {
      alert('텔레그램 스크립트가 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    console.log('🚀 텔레그램 로그인 시도 중...');

    const botId = import.meta.env.VITE_TELEGRAM_BOT_ID;
    if (!botId) {
      console.error('❌ 환경 변수 VITE_TELEGRAM_BOT_ID가 설정되지 않았습니다.');
      return;
    }

    window.Telegram.Login.auth(
      { bot_id: botId, request_access: 'write', embed: 1 },
      async (user) => {
        if (user) {
          console.log('🔥 텔레그램 인증 성공, 서버로 전송합니다...');
          setIsAuthenticating(true);

          try {
            // 1. 환경변수 확인 -> 없으면 DuckDNS(기본) -> 없으면 VPN(최후수단)
            const baseUrl = import.meta.env.VITE_API_URL || 
                            'https://ssh-oci.duckdns.org' || 
                            `https://${import.meta.env.VITE_VPN_ADDR}`;

            // 끝에 슬래시 제거 및 경로 결합
            const cleanBaseUrl = baseUrl.replace(/\/$/, '');
            const finalUrl = `${cleanBaseUrl}/auth/telegram`;
            
            console.log('📡 서버로 요청 전송:', finalUrl);
            
            const response = await fetch(finalUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(user),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.detail || '서버 인증 실패');
            }

            const result = await response.json();
            console.log('✅ 서버 로그인 성공:', result);
            
            // 서버에서 받은 유저 정보와 토큰 저장
            setTelegramUser({ ...user, ...result.user });
            if (result.access_token) {
              localStorage.setItem('auth_token', result.access_token);
            }
            alert(`${user.first_name}님, 환영합니다!`);

          } catch (error) {
            console.error('❌ 서버 통신 에러:', error);
            alert(`로그인 실패: ${error.message}`);
          } finally {
            setIsAuthenticating(false);
          }
        } else {
          console.error('❌ 텔레그램 로그인 실패 또는 사용자가 창을 닫음');
        }
      }
    );
  };

  const handleSelectChange = (e) => {
    handleCompanyChange(e); // Header로부터 받은 함수 호출
    toggleMenu(); // 메뉴 닫기
  };

  return (
    <>
      {isOpen && (
        <div className={`menu-overlay ${isOpen ? 'open' : ''}`} onClick={toggleMenu}>
          <div
            className={`menu-panel ${isOpen ? 'open' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="menu-title">메뉴</div>
            <a
              className="menu-item"
              onClick={() => {
                handleHeaderClick('recent');
              }}
            >
              <span className="icon">🏠</span> 최근 레포트
            </a>
            <a
              className="menu-item"
              onClick={() => {
                handleHeaderClick('global');
              }}
            >
              <span className="icon">🌍</span> 글로벌 레포트
            </a>
            <a
              className="menu-item"
              onClick={() => {
                handleHeaderClick('industry');
              }}
            >
              <span className="icon">🏭</span> 산업 레포트
            </a>

            <div className="menu-item-select">
              <CompanySelect value={selectedCompany} onChange={handleSelectChange} />
            </div>

            <div className="menu-title">키워드 알림</div>
            <div className="telegram-section">
              {!telegramUser ? (
                <div className="telegram-auth-box">
                  <p className="telegram-desc">텔레그램 로그인 후 알림을 받으세요</p>
                  <button 
                    className="telegram-custom-login-btn" 
                    onClick={loginWithTelegram}
                  >
                    <span className="telegram-icon">✈️</span> Telegram으로 로그인
                  </button>
                </div>
              ) : (
                <div className="telegram-user-card">
                  <div className="user-info">
                    <span className="user-name">🔔 {telegramUser.first_name}님 설정 중</span>
                    <span className="user-id">ID: {telegramUser.id}</span>
                  </div>
                  <button className="keyword-setup-btn">알림 키워드 설정</button>
                </div>
              )}
            </div>

            <div className="admin-section">
              <div className="menu-title admin-title">관리자 전용</div>
              <div className="admin-links-grid">
                <a
                  className="menu-item admin-link"
                  href={`https://${import.meta.env.VITE_VPN_ADDR}/code`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="icon">💻</span> VSCode
                </a>
                <a
                  className="menu-item admin-link"
                  href={`https://${import.meta.env.VITE_VPN_ADDR}/explorer/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="icon">📂</span> Explorer
                </a>
                <a
                  className="menu-item admin-link"
                  href={`https://${import.meta.env.VITE_VPN_ADDR}/portainer/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="icon">🐳</span> Docker
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HamburgerMenu;
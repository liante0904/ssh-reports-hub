import React from 'react';
import { DEV_AUTH_ENABLED } from '../../utils/devAuth';

function TelegramAuth({
  telegramUser,
  isAuthenticating,
  loginWithTelegram,
  loginWithTelegramApp,
  loginWithDevBypass,
  handleLogout,
  toggleKeywordOverlay
}) {
  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'ebest_noti_bot';

  return (
    <div className="telegram-section">
      {!telegramUser ? (
        <div className="telegram-auth-box">
          <p className="telegram-desc">텔레그램 로그인</p>
          {DEV_AUTH_ENABLED ? (
            <>
              <button className="telegram-dev-login-btn" onClick={loginWithDevBypass} disabled={isAuthenticating}>
                <span className="telegram-icon">🧪</span> 개발용 우회 로그인
              </button>
              <p className="telegram-dev-desc">
                개발 환경에서는 텔레그램 봇 위젯 대신 로컬 우회 로그인을 사용합니다.
              </p>
            </>
          ) : (
            <div className="telegram-btn-group">
              <button className="telegram-custom-login-btn" onClick={loginWithTelegram} disabled={isAuthenticating}>
                <span className="telegram-icon">✈️</span> {isAuthenticating ? '인증 중...' : '브라우저로 로그인'}
              </button>
              <button className="telegram-app-login-btn" onClick={loginWithTelegramApp}>
                <span className="telegram-icon">📲</span> 앱으로 연결
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="telegram-user-card">
          <div className="user-info-header">
            <span className="user-name">🔔 {telegramUser.first_name}님 <small style={{fontSize: '0.8em', color: '#8e8e93', fontWeight: 'normal'}}>(ID:{telegramUser.id})</small></span>
            <button className="logout-small-btn" onClick={handleLogout}>로그아웃</button>
          </div>

          <div className="bot-connect-banner">
            <a
              href={`https://t.me/${botName}?start=${telegramUser.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bot-connect-btn"
            >
              <span className="icon">🚀</span> 텔레그램 봇 연결하기 (최초 1회 필수)
            </a>
          </div>

          <button className="open-keyword-overlay-btn" onClick={toggleKeywordOverlay}>
            <span className="icon">⚙️</span> 키워드 알림 설정하기
          </button>
        </div>
      )}
    </div>
  );
}

export default TelegramAuth;

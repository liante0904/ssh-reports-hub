import React, { useEffect } from 'react';

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.94 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.57 15 1.7 1.7 0 0 0 3 14H3v-4h.08A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.57 1.7 1.7 0 0 0 10 3V3h4v.08A1.7 1.7 0 0 0 15.06 4.6a1.7 1.7 0 0 0 1.88-.34L17 4.2 19.83 7l-.06.06A1.7 1.7 0 0 0 19.43 9 1.7 1.7 0 0 0 21 10h.08v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function HeaderPopoverShell({ labelledBy, children, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="header-popover-layer" onClick={onClose}>
      <section
        className="header-popover"
        role="dialog"
        aria-modal="false"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>
  );
}

export function NotificationPopover({
  telegramUser,
  keywords,
  isLoadingKeywords,
  onClose,
  onOpenSettings,
  onLogin,
  isAuthenticating,
}) {
  return (
    <HeaderPopoverShell labelledBy="notification-popover-title" onClose={onClose}>
      <div className="header-popover-heading">
        <div>
          <span className="header-popover-eyebrow">Notifications</span>
          <h2 id="notification-popover-title">리포트 알림</h2>
        </div>
        <div className="header-popover-tools">
          <button
            type="button"
            className="header-icon-button"
            onClick={onOpenSettings}
            title="키워드 알림 설정하기"
            aria-label="키워드 알림 설정하기"
          >
            <SettingsIcon />
          </button>
          <button
            type="button"
            className="header-icon-button"
            onClick={onClose}
            title="닫기"
            aria-label="알림 닫기"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {!telegramUser ? (
        <div className="header-popover-empty">
          <span className="header-popover-empty-icon"><BellIcon /></span>
          <strong>로그인 후 알림을 확인할 수 있습니다</strong>
          <p>관심 종목과 애널리스트 키워드를 등록하면 텔레그램으로 알려드립니다.</p>
          <button type="button" className="header-popover-primary" onClick={onLogin} disabled={isAuthenticating}>
            {isAuthenticating ? '인증 중...' : '텔레그램 로그인'}
          </button>
        </div>
      ) : (
        <>
          <div className="notification-status">
            <span className="notification-status-dot" />
            <span>
              <strong>알림 연결됨</strong>
              <small>등록 키워드 {keywords?.length || 0}개</small>
            </span>
          </div>

          {isLoadingKeywords ? (
            <div className="header-popover-loading">알림 설정을 불러오는 중...</div>
          ) : (keywords?.length || 0) > 0 ? (
            <div className="notification-keywords">
              <div className="notification-keywords-title">감시 중인 키워드</div>
              <div className="notification-keyword-list">
                {(keywords || []).slice(0, 6).map((item) => (
                  <span key={item?.keyword}>{item?.keyword}</span>
                ))}
                {(keywords?.length || 0) > 6 && <span>+{keywords.length - 6}</span>}
              </div>
            </div>
          ) : (
            <div className="header-popover-empty compact">
              <strong>등록된 알림 키워드가 없습니다</strong>
              <p>오른쪽 위 톱니바퀴에서 관심 키워드를 추가하세요.</p>
            </div>
          )}

          <div className="notification-latest">
            <span className="notification-latest-icon"><BellIcon /></span>
            <span>
              <strong>새로 확인할 알림이 없습니다</strong>
              <small>새 리포트 알림은 텔레그램으로 전송됩니다.</small>
            </span>
          </div>
        </>
      )}
    </HeaderPopoverShell>
  );
}

export function AccountPopover({ telegramUser, onClose, onOpenSettings, onLogout }) {
  if (!telegramUser) return null;

  return (
    <HeaderPopoverShell labelledBy="account-popover-title" onClose={onClose}>
      <div className="account-popover-profile">
        <span className="account-popover-avatar">
          {(telegramUser.first_name || '?').slice(0, 1)}
        </span>
        <span>
          <h2 id="account-popover-title">{telegramUser.first_name}님</h2>
          <small>Telegram ID {telegramUser.id}</small>
        </span>
        <button
          type="button"
          className="header-icon-button account-close"
          onClick={onClose}
          title="닫기"
          aria-label="내 정보 닫기"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="account-popover-actions">
        <button type="button" onClick={onOpenSettings}>
          <SettingsIcon />
          <span>
            <strong>설정</strong>
            <small>키워드 알림 관리</small>
          </span>
        </button>
        <button type="button" className="account-logout-button" onClick={onLogout}>
          <span className="account-action-symbol">↪</span>
          <span>
            <strong>로그아웃</strong>
            <small>현재 계정에서 나가기</small>
          </span>
        </button>
      </div>
    </HeaderPopoverShell>
  );
}

export { BellIcon };

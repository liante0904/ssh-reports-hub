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

function formatRelativeTime(dateString) {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 1000 / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
  } catch {
    return '방금 전';
  }
}

function getNotificationKey(item) {
  return item?.notification_key || `${item?.source || 'summary'}:${item?.id}`;
}

export function NotificationPopover({
  telegramUser,
  keywords,
  isLoadingKeywords,
  onClose,
  onOpenSettings,
  onLogin,
  isAuthenticating,
  notifications = [],
  readNotifyIds = [],
  onMarkAllAsRead,
  onNotificationClick,
}) {
  const hasUnread = notifications.some(item => (
    !readNotifyIds.includes(getNotificationKey(item)) && !readNotifyIds.includes(item.id)
  ));

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

      {notifications.length > 0 ? (
        <>
          <div className="notification-list-container">
            {notifications.map((item) => {
              const isUnread = !readNotifyIds.includes(getNotificationKey(item)) && !readNotifyIds.includes(item.id);
              const isSummary = item.source === 'summary';
              return (
                <div
                  key={getNotificationKey(item)}
                  className={`notification-item ${isUnread ? 'unread' : ''}`}
                  onClick={() => onNotificationClick?.(item)}
                >
                  <span className={`notification-item-icon ${isSummary ? 'gemini' : 'telegram'}`}>
                    {isSummary ? '▲' : 'T'}
                  </span>
                  <div className="notification-item-content">
                    <div className="notification-item-message">
                      {item.message}
                    </div>
                    <div className="notification-item-time">
                      {isSummary ? 'AI 요약' : '텔레그램 발송'} · {formatRelativeTime(item.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="notification-actions-footer">
            <span style={{ color: 'var(--text-muted)' }}>
              알림 {notifications.length}개
            </span>
            {hasUnread && (
              <button
                type="button"
                className="notification-clear-btn"
                onClick={onMarkAllAsRead}
              >
                모두 읽음으로 표시
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="header-popover-empty">
          <span className="header-popover-empty-icon"><BellIcon /></span>
          <strong>새로 확인할 요약 완료 알림이 없습니다</strong>
          <p>리포트 AI 요약이 백그라운드에서 완료되면 이곳에 실시간으로 표시됩니다.</p>
        </div>
      )}

      {/* 텔레그램 연동 정보 및 키워드 감시 기능 가이드 */}
      {!telegramUser ? (
        <div className="header-popover-empty" style={{ borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)', padding: '20px 22px' }}>
          <strong>실시간 키워드 감시 서비스</strong>
          <p>텔레그램 로그인 후 알림 키워드를 감시해 보세요.</p>
          <button type="button" className="header-popover-primary" onClick={onLogin} disabled={isAuthenticating} style={{ marginTop: '10px' }}>
            {isAuthenticating ? '인증 중...' : '텔레그램 로그인'}
          </button>
        </div>
      ) : (
        <div style={{ borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.02)', padding: '12px 16px' }}>
          <div className="notification-status" style={{ borderBottom: 'none', padding: 0 }}>
            <span className="notification-status-dot" />
            <span>
              <strong>키워드 텔레그램 알림 활성화됨</strong>
              <small>{isLoadingKeywords ? '키워드 확인 중' : `등록 키워드 ${keywords?.length || 0}개`}</small>
            </span>
          </div>
          {keywords?.length > 0 && (
            <div className="notification-keywords" style={{ padding: '8px 0 0 0', borderBottom: 'none' }}>
              <div className="notification-keyword-list">
                {(keywords || []).slice(0, 4).map((item) => (
                  <span key={item?.keyword} style={{ padding: '3px 7px', fontSize: '0.68rem' }}>{item?.keyword}</span>
                ))}
                {(keywords?.length || 0) > 4 && <span style={{ padding: '3px 7px', fontSize: '0.68rem' }}>+{keywords.length - 4}</span>}
              </div>
            </div>
          )}
        </div>
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

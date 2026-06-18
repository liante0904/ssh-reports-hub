import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HamburgerMenu from './HamburgerMenu';
import KeywordOverlay from './menu/KeywordOverlay';
import { AccountPopover, BellIcon, NotificationPopover } from './HeaderPopovers';
import { useReport } from '../context/useReport';
import { request } from '../utils/api';
import { getDirectUrl } from '../utils/reportLinks';
import { CONFIG } from '../constants/config';
import { HEADER_PATHS } from '../utils/headerNavigation';
import { useHeaderSearchState } from '../hooks/useHeaderSearchState';
import { useKeywords } from '../hooks/useKeywords';
import { useTelegramAuth } from '../hooks/useTelegramAuth';
import './Header.css';

const SUMMARY_NOTIFICATION_EVENT = 'ssh-summary-notification';
const NOTIFICATION_TOAST_TIMEOUT_MS = 4500;

function getNotificationKey(item) {
  return item?.notification_key || `${item?.source || 'summary'}:${item?.id}`;
}

function normalizeNotificationItem(item) {
  return {
    ...item,
    source: item.summary_model ? 'summary' : 'telegram',
    notification_key: item.notification_key || `${item.summary_model ? 'summary' : 'telegram'}:${item.id}`,
    created_at: item.created_at,
    pdf_url: item.pdf_url || null,
    telegram_url: item.telegram_url || null,
    article_url: item.article_url || null,
    sec_firm_order: item.sec_firm_order ?? null,
  };
}

function normalizeLocalSummaryEvent(detail) {
  const id = `local-${detail.status || 'summary'}-${detail.report_id}-${Date.now()}`;
  return {
    id,
    report_id: detail.report_id,
    article_title: detail.article_title,
    firm_nm: detail.firm_nm || '',
    source: 'summary',
    notification_key: `local-summary:${id}`,
    message: detail.message,
    created_at: detail.created_at || new Date().toISOString(),
    status: detail.status,
  };
}

const Header = forwardRef(({ isNavVisible }, ref) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activePopover, setActivePopover] = useState(null);

  const {
    toggleSearch, 
    isTopMenuOpen, 
    toggleMenuTop, 
    isMenuOpen, 
    toggleMenu, 
    handleSearch,
    setSortBy,
    boards,
    activeSearch,
    telegramUser,
    logout,
  } = useReport();
  const { isAuthenticating, loginWithTelegram } = useTelegramAuth();
  const keywordState = useKeywords(telegramUser);

  const {
    clearSearchState,
    handleCompanyChange,
    handleBoardChange,
    handleSearchButtonClick,
    selectedCompanyOrder,
  } = useHeaderSearchState({
    activeSearch,
    boards,
    handleSearch,
    navigate,
    searchParams,
    setSearchParams,
    setSortBy,
    toggleSearch,
  });

  const renderTelegramBadge = () => {
    if (telegramUser) {
      return (
        <button
          type="button"
          className="tg-badge tg-badge-on"
          title={`텔레그램 로그인: ${telegramUser.first_name} (ID:${telegramUser.id})`}
          onClick={() => setActivePopover((current) => current === 'account' ? null : 'account')}
          aria-expanded={activePopover === 'account'}
          aria-haspopup="dialog"
        >
          <span className="tg-badge-icon">✈️</span>
          <span className="tg-badge-name">{telegramUser.first_name}</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        className="tg-badge tg-badge-off"
        title="텔레그램 브라우저 로그인"
        onClick={loginWithTelegram}
        disabled={isAuthenticating}
      >
        <span className="tg-badge-icon">✈️</span>
        <span className="tg-badge-name">{isAuthenticating ? '인증 중' : '로그인'}</span>
      </button>
    );
  };

  const closePopover = useCallback(() => setActivePopover(null), []);

  const handleOpenKeywordSettings = () => {
    setActivePopover(null);
    if (!telegramUser) {
      loginWithTelegram();
      return;
    }
    keywordState.openKeywordOverlay();
  };

  const handleNotificationClick = () => {
    setActivePopover((current) => current === 'notifications' ? null : 'notifications');
  };

  const [notifications, setNotifications] = useState([]);
  const [localNotifications, setLocalNotifications] = useState([]);
  const [notificationToast, setNotificationToast] = useState(null);
  const [readNotifyIds, setReadNotifyIds] = useState(() => {
    try {
      const saved = localStorage.getItem('ssh_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fetchNotifications = useCallback(async () => {
    try {
      const url = `${CONFIG.API.REPORT_API_URL}/reports/notifications?limit=50`;
      const data = await request(url, { skipAuth: false });
      const items = Array.isArray(data) ? data.map(normalizeNotificationItem) : [];
      setNotifications(items.sort((a, b) => (
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      )));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const visibleNotifications = [...localNotifications, ...notifications]
    .filter((item, index, items) => (
      items.findIndex((candidate) => getNotificationKey(candidate) === getNotificationKey(item)) === index
    ))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 50);

  const unreadCount = visibleNotifications.filter(
    (item) => !readNotifyIds.includes(getNotificationKey(item)) && !readNotifyIds.includes(item.id)
  ).length;

  const handleMarkAllAsRead = useCallback(() => {
    const allIds = visibleNotifications.flatMap((item) => [getNotificationKey(item), item.id]);
    setReadNotifyIds(allIds);
    localStorage.setItem('ssh_read_notifications', JSON.stringify(allIds));
  }, [visibleNotifications]);

  const handleNotificationItemClick = useCallback((item) => {
    const notificationKey = getNotificationKey(item);
    if (!readNotifyIds.includes(notificationKey) && !readNotifyIds.includes(item.id)) {
      const nextReadIds = [...readNotifyIds, notificationKey, item.id];
      setReadNotifyIds(nextReadIds);
      localStorage.setItem('ssh_read_notifications', JSON.stringify(nextReadIds));
    }
    setActivePopover(null);

    // 게시글 제목 클릭과 동일한 방식으로 링크 열기
    const report = {
      report_id: item.report_id,
      article_title: item.article_title || '',
      firm_nm: item.firm_nm || '',
      sec_firm_order: item.sec_firm_order ?? null,
      link: item.pdf_url || item.telegram_url || '',
      pdf_url: item.pdf_url || null,
      download_url: item.download_url || null,
      telegram_url: item.telegram_url || null,
    };
    const url = getDirectUrl(report);
    if (url && item.report_id) {
      window.open(url, '_blank');
    } else if (item.article_title) {
      handleSearch(item.article_title);
      navigate('/');
    }
  }, [readNotifyIds, handleSearch, navigate]);

  useEffect(() => {
    const handleSummaryNotification = (event) => {
      const item = normalizeLocalSummaryEvent(event.detail || {});
      setLocalNotifications((current) => [item, ...current].slice(0, 20));
      setNotificationToast(item);
    };

    window.addEventListener(SUMMARY_NOTIFICATION_EVENT, handleSummaryNotification);
    return () => window.removeEventListener(SUMMARY_NOTIFICATION_EVENT, handleSummaryNotification);
  }, []);

  useEffect(() => {
    if (!notificationToast) return undefined;
    const timeout = setTimeout(() => setNotificationToast(null), NOTIFICATION_TOAST_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [notificationToast]);

  useEffect(() => {
    if (isTopMenuOpen || !isNavVisible) {
      setActivePopover(null);
    }
  }, [isNavVisible, isTopMenuOpen]);

  const handleButtonClick = (buttonName) => {
    if (isTopMenuOpen) toggleMenuTop();
    if (isMenuOpen) toggleMenu();
    
    if (buttonName !== 'search') {
      clearSearchState({ navigateHome: false });
    }

    if (buttonName === 'recent') {
      setSortBy('time');
    }

    const targetPath = HEADER_PATHS[buttonName];
    if (targetPath && buttonName !== 'search') {
      navigate({ pathname: targetPath });
    }

    if (buttonName === 'search') {
      handleSearchButtonClick();
    }
  };

  return (
    <>
      <header ref={ref} className={!isNavVisible ? 'nav-hidden' : ''}>
        <div className="header-top">
          <div className="title" onClick={() => handleButtonClick('home')}>
            🏠 ssh-reports-hub
          </div>
          <div className="header-actions">
            {renderTelegramBadge()}
            <button
              type="button"
              className="header-search-button"
              onClick={() => handleButtonClick('search')}
              title="검색"
              aria-label="검색 열기"
            >
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            <button
              type="button"
              className="header-notification-button"
              onClick={handleNotificationClick}
              title="리포트 알림"
              aria-label="리포트 알림"
              aria-expanded={activePopover === 'notifications'}
              aria-haspopup="dialog"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>
            <button type="button" className="hamburger-menu" onClick={toggleMenuTop} title="메뉴" aria-label="메뉴 열기">
              <div></div>
              <div></div>
              <div></div>
            </button>
          </div>
        </div>
      </header>

      {activePopover === 'notifications' && (
        <NotificationPopover
          telegramUser={telegramUser}
          keywords={keywordState.keywords}
          isLoadingKeywords={keywordState.isLoadingKeywords}
          onClose={closePopover}
          onOpenSettings={handleOpenKeywordSettings}
          onLogin={loginWithTelegram}
          isAuthenticating={isAuthenticating}
          notifications={visibleNotifications}
          readNotifyIds={readNotifyIds}
          onMarkAllAsRead={handleMarkAllAsRead}
          onNotificationClick={handleNotificationItemClick}
        />
      )}

      {notificationToast && (
        <button
          type="button"
          className="header-notification-toast"
          onClick={() => {
            setActivePopover('notifications');
            setNotificationToast(null);
          }}
        >
          <span className={`notification-toast-icon ${notificationToast.source || 'summary'}`}>
            {notificationToast.source === 'telegram' ? 'T' : '▲'}
          </span>
          <span>{notificationToast.message}</span>
        </button>
      )}

      {activePopover === 'account' && (
        <AccountPopover
          telegramUser={telegramUser}
          onClose={closePopover}
          onOpenSettings={handleOpenKeywordSettings}
          onLogout={logout}
        />
      )}

      <HamburgerMenu
        isOpen={isTopMenuOpen}
        toggleMenu={toggleMenuTop}
        selectedCompany={selectedCompanyOrder}
        handleCompanyChange={handleCompanyChange}
        handleHeaderClick={handleButtonClick}
        boards={boards}
        selectedBoard={activeSearch.board}
        handleBoardChange={handleBoardChange}
        keywordState={keywordState}
      />

      {keywordState.isKeywordOverlayOpen && createPortal(
        <KeywordOverlay
          newKeyword={keywordState.newKeyword}
          setNewKeyword={keywordState.setNewKeyword}
          handleAddKeyword={keywordState.handleAddKeyword}
          handleDeleteKeyword={keywordState.handleDeleteKeyword}
          handleDeleteAllKeywords={keywordState.handleDeleteAllKeywords}
          handleUndoDelete={keywordState.handleUndoDelete}
          keywords={keywordState.keywords}
          isLoadingKeywords={keywordState.isLoadingKeywords}
          lastDeleted={keywordState.lastDeleted}
          toggleKeywordOverlay={keywordState.closeKeywordOverlay}
        />,
        document.body
      )}
    </>
  );
});

export default Header;

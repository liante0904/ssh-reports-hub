import React, { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../constants/config';
import { FIRM_NAMES } from '../constants/firms';
import { request } from '../utils/api';
import {
  createEmptySearchSelection,
  getSelectedCompanyOrder,
  normalizeSearchSelection,
} from '../utils/searchSelection';
import ReportContext from './reportContext';

export function ReportProvider({ children }) {
  const [activeSearch, setActiveSearch] = useState(createEmptySearchSelection());
  const [stagedSearch, setStagedSearch] = useState(createEmptySearchSelection());
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);

  // 텔레그램 사용자 상태 (Context로 전역화)
  const [telegramUser, setTelegramUser] = useState(() => {
    try {
      const savedLocal = localStorage.getItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
      if (savedLocal) return JSON.parse(savedLocal);
      return null;
    } catch {
      return null;
    }
  });
  // 토큰 검증 중 여부 (true일 때는 401 → 로그아웃 건너뜀)
  const [isVerifying, setIsVerifying] = useState(false);

  // LLM 요약 노출 범위 설정 ('admin' 또는 'telegram')
  const [llmVisibility, setLlmVisibility] = useState('admin');

  // 초기 설정 로딩
  useEffect(() => {
    const fetchLlmSetting = async () => {
      try {
        const data = await request(CONFIG.API.LLM_SETTING_URL);
        if (data && data.visibility) {
          setLlmVisibility(data.visibility);
        }
      } catch (error) {
        console.error('Failed to fetch LLM visibility setting:', error);
      }
    };
    fetchLlmSetting();
  }, []);

  // ── 앱 시작 시 토큰 검증 (localStorage 맹신 방지) ──
  useEffect(() => {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    const savedUser = localStorage.getItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
    if (!token || !savedUser) return;

    let cancelled = false;
    setIsVerifying(true);

    const verify = async () => {
      try {
        // /keywords는 auth required — 200이면 토큰 유효, 401이면 만료
        const res = await fetch(`${CONFIG.API.BASE_URL}/keywords`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
        });
        if (cancelled) return;
        if (!res.ok && (res.status === 401 || res.status === 403)) {
          // 토큰 만료/무효 → 조용히 로그아웃 (전체 리로드 없음)
          localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
          localStorage.removeItem(CONFIG.STORAGE_KEYS.REMEMBER_ME);
          setTelegramUser(null);
        }
        // 그 외(200, 네트워크 에러 등) → 기존 상태 유지
      } catch {
        // 네트워크 오류 → 기존 상태 유지 (오프라인 시 로그아웃 방지)
      } finally {
        if (!cancelled) setIsVerifying(false);
      }
    };

    verify();
    return () => { cancelled = true; };
  }, []);

  // ── 크로스탭 동기화 (다른 탭에서 로그인/로그아웃 감지) ──
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === CONFIG.STORAGE_KEYS.AUTH_TOKEN && !e.newValue) {
        // 다른 탭에서 토큰 삭제 → 동기화
        setTelegramUser(null);
      }
      if (e.key === CONFIG.STORAGE_KEYS.TELEGRAM_USER) {
        if (e.newValue) {
          try {
            const user = JSON.parse(e.newValue);
            if (user?.id) setTelegramUser(user);
          } catch { /* 무시 */ }
        } else {
          setTelegramUser(null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // LLM 노출 설정 변경 (관리자 전용)
  const updateLlmSetting = useCallback(async (newVisibility) => {
    try {
      const data = await request(CONFIG.API.ADMIN_LLM_SETTING_URL, {
        method: 'POST',
        body: JSON.stringify({ visibility: newVisibility })
      });
      if (data && data.status === 'success') {
        setLlmVisibility(newVisibility);
        return { success: true, visibility: newVisibility };
      }
      return { success: false, message: 'Invalid response' };
    } catch (error) {
      console.error('Failed to update LLM visibility setting:', error);
      return { success: false, message: error.message };
    }
  }, []);

  const [sortBy, setSortBy] = useState('time');
  const [viewerReport, setViewerReport] = useState(null);
  // 회사 코드는 DB/필터 매핑과 1:1로 맞아야 하므로 고정 순서를 유지한다.
  const companyNames = FIRM_NAMES;
  const [boards, setBoards] = useState([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return savedTheme || (userPrefersDark ? 'dark' : 'light');
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleSearch = useCallback(({ query, category, board = null, companyOrder = null }) => {
    const nextSearch = normalizeSearchSelection({ query, category, board, companyOrder });
    setActiveSearch(prev => {
      if (
        prev.query === nextSearch.query &&
        prev.category === nextSearch.category &&
        prev.board === nextSearch.board &&
        prev.companyOrder === nextSearch.companyOrder
      ) return prev;
      return nextSearch;
    });
  }, []);

  useEffect(() => {
    const companyIndex = getSelectedCompanyOrder(activeSearch, null);
    const controller = new AbortController();

    if (!companyIndex) {
      setBoards([]);
      setIsLoadingBoards(false);
      return () => controller.abort();
    }

    let isActive = true;

    const fetchBoards = async () => {
      setIsLoadingBoards(true);
      try {
        const data = await request(`${CONFIG.API.BOARDS_URL}?company=${companyIndex}`, {
          signal: controller.signal
        });
        if (!isActive) return;
        setBoards(Array.isArray(data) ? data.filter(b => b.report_count > 0) : []);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to fetch boards:', error);
          if (isActive) setBoards([]);
        }
      } finally {
        if (isActive) setIsLoadingBoards(false);
      }
    };

    fetchBoards();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [activeSearch.category, activeSearch.query, activeSearch.companyOrder]);

  const toggleSearch = useCallback(() => setIsSearchOverlayOpen(prev => !prev), []);
  const toggleMenu = useCallback(() => setIsMenuOpen(prev => !prev), []);
  const toggleMenuTop = useCallback(() => setIsTopMenuOpen(prev => !prev), []);

  const logout = useCallback(() => {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.REMEMBER_ME);
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
    setTelegramUser(null);
  }, []);

  const value = {
    searchQuery: activeSearch,
    setSearchQuery: setActiveSearch,
    pendingSearch: stagedSearch,
    setPendingSearch: setStagedSearch,
    activeSearch,
    stagedSearch,
    handleSearch,
    isSearchOpen: isSearchOverlayOpen,
    setIsSearchOpen: setIsSearchOverlayOpen,
    isSearchOverlayOpen,
    toggleSearch,
    isMenuOpen,
    setIsMenuOpen,
    toggleMenu,
    isTopMenuOpen,
    setIsTopMenuOpen,
    toggleMenuTop,
    sortBy,
    setSortBy,
    boards,
    setBoards,
    isLoadingBoards,
    viewerReport,
    setViewerReport,
    firm_names: companyNames,
    companyNames,
    theme,
    setTheme,
    toggleTheme,
    telegramUser,
    setTelegramUser,
    isVerifying,
    llmVisibility,
    updateLlmSetting,
    logout
  };

  return (
    <ReportContext.Provider value={value}>
      {children}
    </ReportContext.Provider>
  );
}

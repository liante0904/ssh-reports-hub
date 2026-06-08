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
      // 과거 세션 저장 사용자의 일시적 호환을 위해 fallback만 유지한다.
      const savedSession = sessionStorage.getItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
      if (savedSession) return JSON.parse(savedSession);
      return null;
    } catch {
      return null;
    }
  });

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
    window.location.reload();
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

import React, { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../constants/config';
import { FIRM_NAMES } from '../constants/firms';
import { request } from '../utils/api';
import ReportContext from './reportContext';

export const ReportProvider = ({ children }) => {
  // 검색 관련 상태
  const [activeSearch, setActiveSearch] = useState({ query: '', category: '', board: null }); // 현재 적용된 검색 조건
  const [stagedSearch, setStagedSearch] = useState({ query: '', category: '', board: null }); // 검색창 입력용 임시 조건
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  
  // 메뉴 관련 상태
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  
  // 정렬 및 데이터 상태
  const [sortBy, setSortBy] = useState('time'); // 'time' or 'company'
  const [viewerReport, setViewerReport] = useState(null); // 인앱 뷰어용 리포트 객체
  const [companyNames, setCompanyNames] = useState(FIRM_NAMES); // 동적 로드되는 증권사 목록
  const [boards, setBoards] = useState([]); // 현재 선택된 증권사의 게시판 목록
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);

  // Theme state
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return savedTheme || (userPrefersDark ? 'dark' : 'light');
  });

  // 증권사 목록 동적 로드
  useEffect(() => {
    const fetchFirms = async () => {
      try {
        const data = await request(CONFIG.API.COMPANIES_URL);
        if (data && Array.isArray(data)) {
          const names = data.map(item => item.name);
          setCompanyNames(names);
        }
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      }
    };
    fetchFirms();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleSearch = useCallback(({ query, category, board = null }) => {
    setActiveSearch(prev => {
      if (prev.query === query && prev.category === category && prev.board === board) return prev;
      return { query, category, board };
    });
  }, []);

  useEffect(() => {
    const companyIndex = activeSearch.category === 'company' ? activeSearch.query : null;
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
  }, [activeSearch.category, activeSearch.query]);

  const toggleSearch = useCallback(() => setIsSearchOverlayOpen(prev => !prev), []);
  const toggleMenu = useCallback(() => setIsSideMenuOpen(prev => !prev), []);
  const toggleMenuTop = useCallback(() => setIsTopMenuOpen(prev => !prev), []);

  const logout = useCallback(() => {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
    window.location.reload(); // 가장 확실한 초기화
  }, []);

  const value = {
    // 검색 관련
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
    
    // 게시판 관련
    boards,
    setBoards,
    isLoadingBoards,

    // 메뉴 관련
    isMenuOpen: isSideMenuOpen,
    setIsMenuOpen: setIsSideMenuOpen,
    isSideMenuOpen,
    toggleMenu,
    isTopMenuOpen,
    setIsTopMenuOpen,
    toggleMenuTop,

    // 정렬 및 뷰어
    sortBy,
    setSortBy,
    viewerReport,
    setViewerReport,

    // 데이터
    firm_names: companyNames,
    companyNames,

    // 공통
    theme,
    setTheme,
    toggleTheme,
    logout
  };

  return (
    <ReportContext.Provider value={value}>
      {children}
    </ReportContext.Provider>
  );
};

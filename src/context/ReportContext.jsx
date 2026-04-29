import React, { createContext, useContext, useState, useEffect } from 'react';
import { CONFIG } from '../constants/config';
import { FIRM_NAMES } from '../constants/firms';
import { request } from '../utils/api';

const ReportContext = createContext();

export function useReport() {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReport must be used within a ReportProvider');
  }
  return context;
}

export function ReportProvider({ children }) {
  // Search state
  const [searchQuery, setSearchQuery] = useState({ query: '', category: '' });
  const [pendingSearch, setPendingSearch] = useState({ query: '', category: '' }); // UI에 미리 채우기용
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState('time'); // 'time' or 'company'
  const [viewerReport, setViewerReport] = useState(null); // 인앱 뷰어용 리포트 객체
  const [firm_names, setFirmNames] = useState(FIRM_NAMES); // 초기값은 하드코딩된 값 사용

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
          // name 필드만 추출하여 배열로 변환
          const names = data.map(item => item.name);
          setFirmNames(names);
        }
      } catch (error) {
        console.error('Failed to fetch companies:', error);
        // 실패 시 FIRM_NAMES 초기값 유지
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

  const handleSearch = ({ query, category }) => {
    setSearchQuery(prev => {
      if (prev.query === query && prev.category === category) return prev;
      return { query, category };
    });
  };

  const toggleSearch = () => setIsSearchOpen(prev => !prev);
  const toggleMenu = () => setIsMenuOpen(prev => !prev);
  const toggleMenuTop = () => setIsTopMenuOpen(prev => !prev);

  const logout = () => {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
    window.location.reload(); // 가장 확실한 초기화
  };

  const value = {
    searchQuery,
    setSearchQuery,
    pendingSearch,
    setPendingSearch,
    handleSearch,
    isSearchOpen,
    setIsSearchOpen,
    toggleSearch,
    isMenuOpen,
    setIsMenuOpen,
    toggleMenu,
    isTopMenuOpen,
    setIsTopMenuOpen,
    toggleMenuTop,
    sortBy,
    setSortBy,
    viewerReport,
    setViewerReport,
    firm_names, // 상태 값으로 변경
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
}

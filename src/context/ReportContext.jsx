import React, { createContext, useContext, useState, useEffect } from 'react';
import { CONFIG } from '../constants/config';

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

  const firm_names = [
    "LS증권", "신한증권", "NH투자증권", "하나증권", "KB증권", "삼성증권",
    "상상인증권", "신영증권", "미래에셋증권", "현대차증권", "키움증권", "DS투자증권",
    "유진투자증권", "한국투자증권", "다올투자증권", "토스증권", "리딩투자증권", "대신증권",
    "IM증권", "DB증권", "메리츠증권", "한화투자증권", "한양증권", "BNK투자증권",
    "교보증권", "IBK투자증권", "SK증권", "유안타증권"
  ];

  // Theme state
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
    firm_names,
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

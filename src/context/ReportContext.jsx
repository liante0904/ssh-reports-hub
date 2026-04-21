import React, { createContext, useContext, useState, useEffect } from 'react';
import { CONFIG } from '../constants/config';
import { FIRM_NAMES } from '../constants/firms';

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
    firm_names: FIRM_NAMES, // 기존 이름 유지하여 하위 컴포넌트 에러 방지
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

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return savedTheme || (userPrefersDark ? 'dark' : 'light');
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleSearch = ({ query, category }) => {
    setSearchQuery({ query, category });
  };

  const toggleSearch = () => setIsSearchOpen(prev => !prev);
  const toggleMenu = () => setIsMenuOpen(prev => !prev);
  const toggleMenuTop = () => setIsTopMenuOpen(prev => !prev);

  const value = {
    searchQuery,
    setSearchQuery,
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
    theme,
    setTheme,
    toggleTheme
  };

  return (
    <ReportContext.Provider value={value}>
      {children}
    </ReportContext.Provider>
  );
}

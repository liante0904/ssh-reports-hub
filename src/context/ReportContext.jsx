import React, { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../constants/config';
import { FIRM_NAMES } from '../constants/firms';
import { request } from '../utils/api';
import { normalizeSearchSelection } from '../utils/searchSelection';
import ReportContext from './reportContext';

export function ReportProvider({ children }) {
  const [activeSearch, setActiveSearch] = useState({ query: '', category: '', board: null });
  const [stagedSearch, setStagedSearch] = useState({ query: '', category: '', board: null });
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);

  const [sortBy, setSortBy] = useState('time');
  const [viewerReport, setViewerReport] = useState(null);
  const [companyNames, setCompanyNames] = useState(FIRM_NAMES);
  const [boards, setBoards] = useState([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return savedTheme || (userPrefersDark ? 'dark' : 'light');
  });

  useEffect(() => {
    const fetchFirms = async () => {
      try {
        const data = await request(CONFIG.API.COMPANIES_URL);
        if (data && Array.isArray(data)) {
          setCompanyNames(data.map(item => item.name));
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
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleSearch = useCallback(({ query, category, board = null }) => {
    const nextSearch = normalizeSearchSelection({ query, category, board });
    setActiveSearch(prev => {
      if (prev.query === nextSearch.query && prev.category === nextSearch.category && prev.board === nextSearch.board) return prev;
      return nextSearch;
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
  const toggleMenu = useCallback(() => setIsMenuOpen(prev => !prev), []);
  const toggleMenuTop = useCallback(() => setIsTopMenuOpen(prev => !prev), []);

  const logout = useCallback(() => {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
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
    logout
  };

  return (
    <ReportContext.Provider value={value}>
      {children}
    </ReportContext.Provider>
  );
}

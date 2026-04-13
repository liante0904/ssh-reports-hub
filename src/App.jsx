import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import SearchOverlay from './components/SearchOverlay';
import ReportList from './components/ReportList';
import BottomNav from './components/BottomNav';
import FloatingMenu from './components/FloatingMenu';
import './index.css';

function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState({ query: '', category: '' });
  const [sortBy, setSortBy] = useState('time'); // 'time' (등록 시간순) or 'company' (회사 번호별)
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isFloatingNavVisible, setIsFloatingNavVisible] = useState(true);
  const lastScrollY = useRef(window.scrollY);
  const headerRef = useRef(null);

  // Theme state management
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

  const toggleFloatingNav = () => setIsFloatingNavVisible(p => !p);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setIsFloatingNavVisible(true);
      } else {
        setIsFloatingNavVisible(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isDesktop = window.innerWidth >= 1024;

      // 스크롤 발생 시 모든 메뉴 닫기
      if (Math.abs(currentScrollY - lastScrollY.current) > 20) {
        if (isMenuOpen) setIsMenuOpen(false);
        if (isTopMenuOpen) setIsTopMenuOpen(false);
      }

      if (isDesktop) {
        setIsNavVisible(false);
        return;
      }

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsNavVisible(false);
      } else {
        setIsNavVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMenuOpen, isTopMenuOpen]);

  useEffect(() => {
    const headerNode = headerRef.current;
    const updateHeaderHeight = () => {
      if (headerNode) {
        document.documentElement.style.setProperty('--header-height', `${headerNode.offsetHeight}px`);
      }
    };

    updateHeaderHeight();
    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    if (headerNode) {
      resizeObserver.observe(headerNode);
    }

    return () => {
      if (headerNode) {
        resizeObserver.unobserve(headerNode);
      }
    };
  }, []);

  const toggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const toggleMenuTop = () => setIsTopMenuOpen((prev) => !prev);
  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const handleWriterSearch = (writer) => {
    setIsSearchOpen(true);
    setSearchQuery({ query: writer, category: 'writer' });
  };

  const handleSearch = ({ query, category }) => {
    setSearchQuery({ query, category });
    if (isMenuOpen) setIsMenuOpen(false);
    if (isTopMenuOpen) setIsTopMenuOpen(false);
  };

  const handleHomeClick = () => {
    setSearchQuery({ query: '', category: '' });
    if (isTopMenuOpen) setIsTopMenuOpen(false);
    if (isMenuOpen) setIsMenuOpen(false);
  };

  return (
    <Router>
      <Header
        ref={headerRef}
        isNavVisible={isNavVisible}
        toggleSearch={toggleSearch}
        toggleMenuTop={toggleMenuTop}
        isTopMenuOpen={isTopMenuOpen}
        toggleFloatingMenu={toggleMenu}
        isFloatingMenuOpen={isMenuOpen}
        onSearch={handleSearch}
        setSortBy={setSortBy}
      />
      
      <main 
        className="main-content" 
        onClick={() => {
          if (isMenuOpen) setIsMenuOpen(false);
          if (isTopMenuOpen) setIsTopMenuOpen(false);
        }}
      >
        <Routes>
          <Route path="/" element={<ReportList searchQuery={searchQuery} sortBy={sortBy} setSortBy={setSortBy} onWriterClick={handleWriterSearch} />} />
          <Route path="/global" element={<ReportList searchQuery={searchQuery} sortBy={sortBy} setSortBy={setSortBy} onWriterClick={handleWriterSearch} />} />
          <Route path="/industry" element={<ReportList searchQuery={searchQuery} sortBy={sortBy} setSortBy={setSortBy} onWriterClick={handleWriterSearch} />} />
        </Routes>
      </main>
      <SearchOverlay
        isOpen={isSearchOpen}
        toggleSearch={toggleSearch}
        onSearch={handleSearch}
        searchQuery={searchQuery} // 전달: SearchOverlay에서 입력값 동기화
      />
      <BottomNav 
        isNavVisible={isNavVisible} 
        toggleSearch={toggleSearch} 
        toggleFloatingNav={toggleFloatingNav}
        onHomeClick={handleHomeClick}
      />
      <FloatingMenu
        isOpen={isMenuOpen}
        toggleMenu={toggleMenu}
        toggleSearch={toggleSearch}
        theme={theme}
        toggleTheme={toggleTheme}
        isFloatingNavVisible={isFloatingNavVisible}
        selectedCompany={searchQuery.category === 'company' ? searchQuery.query : ''}
        onCompanyChange={handleSearch}
      />
    </Router>
  );
}

export default App;

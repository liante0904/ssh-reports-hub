import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import SearchOverlay from './components/SearchOverlay';
import ReportList from './components/ReportList';
import BottomNav from './components/BottomNav';
import FloatingMenu from './components/FloatingMenu';
import { ReportProvider, useReport } from './context/ReportContext';
import './index.css';

function AppContent() {
  const { 
    isSearchOpen, 
    setIsSearchOpen,
    isMenuOpen, 
    setIsMenuOpen,
    isTopMenuOpen, 
    setIsTopMenuOpen,
    searchQuery,
    setSearchQuery,
    handleSearch,
    sortBy,
    setSortBy
  } = useReport();

  const location = useLocation();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isFloatingNavVisible, setIsFloatingNavVisible] = useState(true);
  const lastScrollY = useRef(window.scrollY);
  const headerRef = useRef(null);

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
  }, [isMenuOpen, isTopMenuOpen, setIsMenuOpen, setIsTopMenuOpen]);

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

  const handleWriterSearch = (writer) => {
    setPendingSearch({ query: writer, category: 'writer' });
    setIsSearchOpen(true);
  };

  const handleHomeClick = () => {
    setSearchQuery({ query: '', category: '' });
    if (isTopMenuOpen) setIsTopMenuOpen(false);
    if (isMenuOpen) setIsMenuOpen(false);
  };

  return (
    <>
      <Header
        ref={headerRef}
        isNavVisible={isNavVisible}
      />
      
      <main 
        id="main-content"
        className="main-content" 
        onClick={() => {
          if (isMenuOpen) setIsMenuOpen(false);
          if (isTopMenuOpen) setIsTopMenuOpen(false);
        }}
      >
        <Routes>
          <Route path="/" element={<ReportList key={location.pathname === '/' ? 'recent' : location.pathname} onWriterClick={handleWriterSearch} />} />
          <Route path="/global" element={<ReportList key="global" onWriterClick={handleWriterSearch} />} />
          <Route path="/industry" element={<ReportList key="industry" onWriterClick={handleWriterSearch} />} />
          <Route path="/favorites" element={<ReportList key="favorites" onWriterClick={handleWriterSearch} />} />
        </Routes>
      </main>
      <SearchOverlay />
      <BottomNav 
        isNavVisible={isNavVisible} 
        toggleFloatingNav={toggleFloatingNav}
        onHomeClick={handleHomeClick}
      />
      <FloatingMenu
        isFloatingNavVisible={isFloatingNavVisible}
      />
    </>
  );
}

function App() {
  return (
    <ReportProvider>
      <Router>
        <AppContent />
      </Router>
    </ReportProvider>
  );
}

export default App;

import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'; // useLocation 임포트
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
    toggleSearch, 
    isMenuOpen, 
    toggleMenu, 
    isTopMenuOpen, 
    toggleMenuTop,
    searchQuery,
    handleSearch,
    theme,
    toggleTheme
  } = useReport();

  const location = useLocation(); // useLocation 훅 사용

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
  }, []);

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

  return (
    <>
      <Header
        ref={headerRef}
        isNavVisible={isNavVisible}
      />
      
      <main className="main-content">
        <Routes>
          {/* ReportList에 key prop을 추가하여 탭 전환 시 컴포넌트 재생성 보장 */}
          <Route path="/" element={<ReportList key={location.pathname === '/' ? 'recent' : location.pathname} />} />
          <Route path="/global" element={<ReportList key="global" />} />
          <Route path="/industry" element={<ReportList key="industry" />} />
          <Route path="/favorites" element={<ReportList key="favorites" />} />
        </Routes>
      </main>
      <SearchOverlay />
      <BottomNav 
        isNavVisible={isNavVisible} 
        toggleFloatingNav={toggleFloatingNav}
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

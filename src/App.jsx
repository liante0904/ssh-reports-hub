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
    console.log(`Theme changed to: ${theme}`); // <-- Log added
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    console.log('Toggling theme...'); // <-- Log added
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const toggleFloatingNav = () => setIsFloatingNavVisible(p => !p);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setIsFloatingNavVisible(true); // Always visible on desktop
      } else {
        setIsFloatingNavVisible(false); // Hidden by default on mobile
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
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

      // Hide nav on scroll down, show on scroll up
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

  const toggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const toggleMenuTop = () => setIsTopMenuOpen((prev) => !prev);
  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const handleSearch = ({ query, category }) => {
    setSearchQuery({ query, category });
  };

  return (
    <Router>
      <Header
        ref={headerRef}
        isNavVisible={isNavVisible}
        toggleSearch={toggleSearch}
        toggleMenuTop={toggleMenuTop}
        isTopMenuOpen={isTopMenuOpen}
        toggleFloatingMenu={toggleMenu} // Pass the floating menu toggle
        isFloatingMenuOpen={isMenuOpen} // Pass the floating menu state
        onSearch={handleSearch}
      />
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ReportList searchQuery={searchQuery} />} />
          <Route path="/global" element={<ReportList searchQuery={searchQuery} />} />
          <Route path="/industry" element={<ReportList searchQuery={searchQuery} />} />
        </Routes>
      </main>
      <SearchOverlay
        isOpen={isSearchOpen}
        toggleSearch={toggleSearch}
        onSearch={handleSearch}
      />
      <BottomNav 
        isNavVisible={isNavVisible} 
        toggleSearch={toggleSearch} 
        toggleFloatingNav={toggleFloatingNav}
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

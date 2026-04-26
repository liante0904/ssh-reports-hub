import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import SearchOverlay from './components/SearchOverlay';
import ReportList from './components/ReportList';
import BottomNav from './components/BottomNav';
import FloatingMenu from './components/FloatingMenu';
import { ReportProvider, useReport } from './context/ReportContext';
import { useAppLayout } from './hooks/useAppLayout';
import './index.css';

function AppContent() {
  const { 
    setIsSearchOpen,
    isMenuOpen, 
    setIsMenuOpen,
    isTopMenuOpen, 
    setIsTopMenuOpen,
    setSearchQuery,
    setPendingSearch,
  } = useReport();

  const {
    isNavVisible,
    isFloatingNavVisible,
    headerRef,
    toggleFloatingNav
  } = useAppLayout();

  const location = useLocation();

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
          if (isMenuOpen || isTopMenuOpen) {
            if (isMenuOpen) setIsMenuOpen(false);
            if (isTopMenuOpen) setIsTopMenuOpen(false);
          }
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

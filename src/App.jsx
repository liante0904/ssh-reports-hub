import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import SearchOverlay from './components/SearchOverlay';
import ReportList from './components/ReportList';
import BottomNav from './components/BottomNav';
import FloatingMenu from './components/FloatingMenu';
import { ReportProvider } from './context/ReportContext';
import { useReport } from './context/useReport';
import { useAppLayout } from './hooks/useAppLayout';
import PDFViewerModal from './components/report/PDFViewerModal';
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
    viewerReport,
    setViewerReport,
  } = useReport();

  const {
    isNavVisible,
    isFloatingNavVisible,
    headerRef,
    toggleFloatingNav
  } = useAppLayout();

  const location = useLocation();

  // 글로벌 워밍업: 앱 시작 시 서버(Lambda) 미리 깨우기
  useEffect(() => {
    const warmUp = async () => {
      const origin = window.location.origin;
      const targets = [
        `${origin}/.netlify/functions/proxy?warmup=true`,
        `${origin}/.netlify/functions/share?warmup=true`
      ];
      
      // 사용자 몰래 백그라운드에서 신호만 보냄
      targets.forEach(url => {
        fetch(url, { method: 'HEAD', mode: 'no-cors' }).catch(() => {});
      });
      console.log('[App] Global warm-up signal sent to serverless functions');
    };
    
    // 브라우저 로딩이 완전히 끝난 뒤 여유 있을 때 실행
    if (window.requestIdleCallback) {
      window.requestIdleCallback(warmUp);
    } else {
      setTimeout(warmUp, 2000);
    }
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
      
      {/* 인앱 뷰어 모달 */}
      {viewerReport && (
        <PDFViewerModal 
          report={viewerReport} 
          onClose={() => setViewerReport(null)} 
        />
      )}
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

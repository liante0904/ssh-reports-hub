import { useNavigate, useSearchParams } from 'react-router-dom';
import { useReport } from '../context/ReportContext';
import CompanySelect from './CompanySelect';
import './FloatingMenu.css';

function FloatingMenu({ isFloatingNavVisible }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    isMenuOpen: isOpen, 
    toggleMenu, 
    toggleSearch, 
    theme, 
    toggleTheme,
    handleSearch: onCompanyChange,
    searchQuery
  } = useReport();

  const selectedCompany = searchQuery.category === 'company' ? searchQuery.query : '';

  const handleOverlayClick = () => {
    if (isOpen) {
      toggleMenu();
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleSelectChange = (e) => {
    const selectedValue = e.target.value;
    
    if (selectedValue) {
      setSearchParams({ q: selectedValue, category: 'company' }, { replace: true });
      onCompanyChange({ query: selectedValue, category: 'company' });
    } else {
      setSearchParams({}, { replace: true });
      onCompanyChange({ query: '', category: 'company' });
    }
    
    navigate({ pathname: '/' });
    toggleMenu();
  };

  return (
    <>
      {isFloatingNavVisible && (
        <nav className="floating-nav" style={{ zIndex: 10 }}>
          <button className="floating-button theme-fab" onClick={toggleTheme} title="테마 변경">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button className="floating-button search-fab" onClick={toggleSearch} title="검색">
            🔍
          </button>
          <button className="floating-button refresh-fab" onClick={handleRefresh} title="새로고침">
            🔄
          </button>
          <button className="floating-button menu-fab" onClick={toggleMenu} title="메뉴">
            ☰
          </button>
        </nav>
      )}

      {isOpen && (
        <div
          className="floating-menu-overlay"
          onClick={handleOverlayClick}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9,
          }}
        >
          <div
            className={`floating-menu ${isOpen ? 'open' : ''}`}
            id="floatingMenu"
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 10 }}
          >
            <div className="floating-menu-content">
              <div className="menu-item" onClick={() => { navigate('/'); toggleMenu(); }}>
                <span className="icon">🏠</span> 홈
              </div>
              <div className="menu-item" onClick={() => { navigate('/global'); toggleMenu(); }}>
                <span className="icon">🌍</span> 글로벌
              </div>
              <div className="menu-item" onClick={() => { navigate('/industry'); toggleMenu(); }}>
                <span className="icon">🏭</span> 산업
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FloatingMenu;

import { useNavigate, useSearchParams } from 'react-router-dom';
import CompanySelect from './CompanySelect';
import './FloatingMenu.css';

function FloatingMenu({ 
  isOpen, 
  toggleMenu, 
  toggleSearch, 
  theme, 
  toggleTheme, 
  isFloatingNavVisible,
  selectedCompany,
  onCompanyChange
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 메뉴가 열렸을 때 외부 클릭으로 닫기
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
    
    // Header.jsx의 handleCompanyChange 로직과 동일하게 구현
    if (selectedValue) {
      setSearchParams({ q: selectedValue, category: 'company' }, { replace: true });
      if (typeof onCompanyChange === 'function') {
        onCompanyChange({ query: selectedValue, category: 'company' });
      }
    } else {
      setSearchParams({}, { replace: true });
      if (typeof onCompanyChange === 'function') {
        onCompanyChange({ query: '', category: 'company' });
      }
    }
    
    navigate({ pathname: '/' });
    toggleMenu(); // 메뉴 닫기
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

      {/* 메뉴가 열려 있을 때만 외부 레이어 보이게 */}
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
            onClick={(e) => e.stopPropagation()} // 내부 클릭 시 닫힘 방지
            style={{ zIndex: 10 }} // 메뉴가 오버레이 위에 보이도록
          >
            <div className="floating-menu-content">
              <a className="menu-item" href="/">
                <span className="icon">🏠</span> 홈
              </a>
              <a className="menu-item" href="/global">
                <span className="icon">🌍</span> 글로벌
              </a>
              <a className="menu-item" href="/industry">
                <span className="icon">🏭</span> 산업
              </a>
              
              {/* 추후 작업을 위해 증권사 필터 주석 처리
              <div className="menu-divider"></div>
              
              <div className="menu-item company-filter-item">
                <span className="icon">🏦</span>
                <CompanySelect 
                  value={selectedCompany} 
                  onChange={handleSelectChange}
                  className="floating-company-select"
                />
              </div>
              */}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FloatingMenu;
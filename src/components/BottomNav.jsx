import { useNavigate } from 'react-router-dom';
import { useReport } from '../context/useReport';
import './BottomNav.css';

function BottomNav({ isNavVisible, toggleFloatingNav, onHomeClick }) {
  const { toggleSearch, toggleSearchNew } = useReport();
  const navigate = useNavigate();

  const handleSearchClick = () => {
    toggleSearch();
  };

  const handleSearchNewClick = () => {
    toggleSearchNew();
  };

  return (
    <nav className={`bottom-nav ${isNavVisible ? '' : 'hidden'}`}>
      <button className="nav-button" onClick={() => {
        onHomeClick();
        navigate('/');
      }} title="홈">
        <span>🏠</span>
      </button>
      <button className="nav-button" onClick={handleSearchClick} title="기존 검색">
        <span>🔍</span>
      </button>
      <button className="nav-button" onClick={handleSearchNewClick} title="신규 검색 및 필터" style={{ position: 'relative' }}>
        <span>🔎</span>
        <span style={{ 
          fontSize: '9px', 
          position: 'absolute', 
          top: '6px', 
          right: '6px', 
          backgroundColor: '#ff3b30', 
          color: 'white', 
          borderRadius: '4px', 
          padding: '1px 3px', 
          fontWeight: 'bold',
          lineHeight: '1'
        }}>N</span>
      </button>
      <button className="nav-button" onClick={() => navigate('/favorites')} title="즐겨찾기">
        <span>⭐</span>
      </button>
      <button className="nav-button" onClick={toggleFloatingNav} title="메뉴">
        <span>☰</span>
      </button>
    </nav>
  );
}

export default BottomNav;

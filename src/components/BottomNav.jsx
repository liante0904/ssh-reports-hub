import { useNavigate } from 'react-router-dom';
import { useReport } from '../context/useReport';
import './BottomNav.css';

function BottomNav({ isNavVisible, toggleFloatingNav, onHomeClick }) {
  const { setIsMenuOpen, setIsTopMenuOpen } = useReport();
  const navigate = useNavigate();

  const handleSearchClick = () => {
    setIsMenuOpen(false);
    setIsTopMenuOpen(false);
    navigate('/search-new');
  };

  return (
    <nav className={`bottom-nav ${isNavVisible ? '' : 'hidden'}`}>
      <button className="nav-button" onClick={() => {
        onHomeClick();
        navigate('/');
      }} title="홈">
        <span>🏠</span>
      </button>
      <button className="nav-button" onClick={handleSearchClick} title="검색 및 필터">
        <span>🔍</span>
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

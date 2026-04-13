import { useNavigate } from 'react-router-dom';
import { useReport } from '../context/ReportContext';
import './BottomNav.css';

function BottomNav({ isNavVisible, toggleFloatingNav, onHomeClick }) {
  const { toggleSearch, isSearchOpen, setSearchQuery } = useReport();
  const navigate = useNavigate();

  const handleSearchClick = () => {
    // 오버레이를 열 때만(현재 닫혀있을 때만) 검색어 초기화
    if (!isSearchOpen) {
      setSearchQuery({ query: '', category: '' });
    }
    toggleSearch();
  };

  return (
    <nav className={`bottom-nav ${isNavVisible ? '' : 'hidden'}`}>
      <button className="nav-button" onClick={() => {
        onHomeClick();
        navigate('/');
      }}>
        <span>🏠</span>
      </button>
      <button className="nav-button" onClick={handleSearchClick}>
        <span>🔍</span>
      </button>
      <button className="nav-button" onClick={() => navigate('/favorites')}>
        <span>⭐</span>
      </button>
      <button className="nav-button" onClick={toggleFloatingNav}>
        <span>☰</span>
      </button>
    </nav>
  );
}

export default BottomNav;

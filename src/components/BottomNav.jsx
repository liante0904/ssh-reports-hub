import { useNavigate } from 'react-router-dom';
import { useReport } from '../context/useReport';
import './BottomNav.css';

function BottomNav({ isNavVisible, toggleFloatingNav, onHomeClick }) {
  const { toggleSearch } = useReport();
  const navigate = useNavigate();

  const handleSearchClick = () => {
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

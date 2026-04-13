import { useNavigate } from 'react-router-dom';
import './BottomNav.css';

function BottomNav({ isNavVisible, toggleSearch, toggleFloatingNav, onHomeClick }) {
  const navigate = useNavigate();

  return (
    <nav className={`bottom-nav ${isNavVisible ? '' : 'hidden'}`}>
      <button className="nav-button" onClick={() => {
        onHomeClick();
        navigate('/');
      }}>
        <span>🏠</span>
      </button>
      <button className="nav-button" onClick={toggleSearch}>
        <span>🔍</span>
      </button>
      <button className="nav-button" onClick={toggleFloatingNav}>
        <span>☰</span>
      </button>
    </nav>
  );
}

export default BottomNav;

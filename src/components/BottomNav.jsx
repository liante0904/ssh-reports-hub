import { useReport } from '../context/ReportContext';
import './BottomNav.css';

function BottomNav({ isNavVisible, toggleFloatingNav }) {
  const { toggleSearch } = useReport();
  
  return (
    <nav className={`bottom-nav ${isNavVisible ? '' : 'hidden'}`}>
      <button className="nav-button" onClick={() => (window.location.href = '/')}>
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

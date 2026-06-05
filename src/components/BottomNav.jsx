import { useNavigate } from 'react-router-dom';
import { useReport } from '../context/useReport';
import './BottomNav.css';

function BottomNav({ isNavVisible, onHomeClick }) {
  const { setIsMenuOpen, setIsTopMenuOpen } = useReport();
  const navigate = useNavigate();

  const handleSearchClick = () => {
    setIsMenuOpen(false);
    setIsTopMenuOpen(false);
    navigate('/search-new');
  };

  const handleFnGuideClick = () => {
    setIsMenuOpen(false);
    setIsTopMenuOpen(false);
    navigate('/fnguide');
  };

  const handleMenuClick = () => {
    setIsMenuOpen(false);
    setIsTopMenuOpen(true);
  };

  return (
    <nav className={`bottom-nav ${isNavVisible ? '' : 'hidden'}`}>
      <button className="nav-button" onClick={() => {
        onHomeClick();
        navigate('/');
      }} title="홈">
        <span>🏠</span>
        <small>홈</small>
      </button>
      <button className="nav-button" onClick={handleSearchClick} title="검색 및 필터">
        <span>🔍</span>
        <small>검색</small>
      </button>
      <button className="nav-button" onClick={handleFnGuideClick} title="종목요약">
        <span>📄</span>
        <small>종목요약</small>
      </button>
      <button className="nav-button" onClick={handleMenuClick} title="메뉴">
        <span>☰</span>
        <small>메뉴</small>
      </button>
    </nav>
  );
}

export default BottomNav;

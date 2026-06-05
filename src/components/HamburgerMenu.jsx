import React from 'react';
import CompanySelect from './CompanySelect';
import BoardSelect from './BoardSelect';
import AdminSection from './menu/AdminSection';
import { useReport } from '../context/useReport';
import './HamburgerMenu.css';

function HamburgerMenu({
  isOpen,
  toggleMenu,
  selectedCompany,
  handleCompanyChange,
  handleHeaderClick,
  boards = [],
  selectedBoard,
  handleBoardChange,
}) {
  const { telegramUser } = useReport();

  const handleSelectChange = (e) => {
    handleCompanyChange(e);
    toggleMenu();
  };

  return (
    <>
      {isOpen && (
        <div className={`menu-overlay ${isOpen ? 'open' : ''}`} onClick={toggleMenu}>
          <div className={`menu-panel ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="menu-title">메뉴</div>
            <a className="menu-item" onClick={() => handleHeaderClick('home')}><span className="icon">🏠</span> 홈</a>
            <a className="menu-item" onClick={() => handleHeaderClick('recent')}><span className="icon">🏠</span> 최근 레포트</a>
            <a className="menu-item" onClick={() => handleHeaderClick('global')}><span className="icon">🌍</span> 글로벌 레포트</a>
            <a className="menu-item" onClick={() => handleHeaderClick('industry')}><span className="icon">🏭</span> 산업 레포트</a>
            <a className="menu-item" onClick={() => handleHeaderClick('outlook')}><span className="icon">🔮</span> 전망 레포트</a>
            <a className="menu-item" onClick={() => handleHeaderClick('ai_summary')}><span className="icon">🤖</span> AI요약</a>
            <a className="menu-item" onClick={() => handleHeaderClick('fnguide')}><span className="icon">📄</span> 종목요약</a>

            <div className="menu-item-select">
              <CompanySelect value={selectedCompany} onChange={handleSelectChange} className="company-select" />
            </div>
            {selectedCompany && boards.length > 0 && (
              <div className="menu-item-select" style={{ marginTop: '8px' }}>
                <BoardSelect
                  value={selectedBoard}
                  boards={boards}
                  onChange={(e) => {
                    handleBoardChange(e);
                    toggleMenu();
                  }}
                  className="board-select"
                />
              </div>
            )}

            <AdminSection isAdmin={telegramUser?.is_admin} />
          </div>
        </div>
      )}
    </>
  );
}

export default HamburgerMenu;

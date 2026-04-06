import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './CompanySelect.css';

const firm_names = [
  "LS증권", "신한증권", "NH투자증권", "하나증권", "KB증권", "삼성증권",
  "상상인증권", "신영증권", "미래에셋증권", "현대차증권", "키움증권", "DS투자증권",
  "유진투자증권", "한국투자증권", "다올투자증권", "토스증권", "리딩투자증권", "대신증권",
  "IM증권", "DB증권", "메리츠증권", "한화투자증권", "한양증권", "BNK투자증권",
  "교보증권", "IBK투자증권", "SK증권", "유안타증권"
];

// 증권사별 테마 색상 (선택 사항 - 시각적 구분용)
const firm_colors = {
  "삼성증권": "#0052A4", "미래에셋증권": "#FF6B00", "키움증권": "#9B218B",
  "NH투자증권": "#004098", "KB증권": "#FFCC00", "신한증권": "#0046FF",
  "한국투자증권": "#000000", "하나증권": "#00918E", "토스증권": "#2461FF"
};

function CompanySelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedName = value !== "" ? firm_names[value] : "증권사 필터";

  const toggleOverlay = () => {
    setIsOpen(!isOpen);
    if (!isOpen) setSearchTerm('');
  };

  const handleSelect = (idx) => {
    onChange({ target: { value: idx.toString() } });
    setIsOpen(false);
  };

  const filteredFirms = firm_names
    .map((name, idx) => ({ name, idx }))
    .filter(item => item.name.includes(searchTerm));

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const overlay = (
    <div className="grid-overlay-portal">
      <div className="grid-overlay-header">
        <div className="grid-header-top">
          <h3>증권사 선택</h3>
          <button className="grid-close-btn" onClick={() => setIsOpen(false)}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="grid-search-wrapper">
          <input 
            type="text" 
            placeholder="찾으시는 증권사를 입력하세요" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid-overlay-content">
        <div className="firm-checkerboard">
          <div 
            className={`checker-item all ${value === "" ? 'active' : ''}`}
            onClick={() => handleSelect("")}
          >
            <div className="checker-icon">ALL</div>
            <div className="checker-name">전체보기</div>
          </div>
          
          {filteredFirms.map(({ name, idx }) => {
            const initial = name.substring(0, 1);
            const themeColor = firm_colors[name] || '#666';
            
            return (
              <div 
                key={idx} 
                className={`checker-item ${value.toString() === idx.toString() ? 'active' : ''}`}
                onClick={() => handleSelect(idx)}
              >
                <div className="checker-icon" style={{ backgroundColor: themeColor + '15', color: themeColor }}>
                  {initial}
                </div>
                <div className="checker-name">{name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="company-grid-container">
      <button className={`grid-trigger-btn ${value !== "" ? 'selected' : ''}`} onClick={toggleOverlay}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/>
        </svg>
        <span>{selectedName}</span>
      </button>

      {isOpen && createPortal(overlay, document.body)}
    </div>
  );
}

export default CompanySelect;

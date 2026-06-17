import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGridOverlay } from '../hooks/useGridOverlay';
import { hasGridSelection } from '../utils/gridSelect';
import { getFirmNameByOrder, getFirmOrderByName } from '../constants/firms';
import { request } from '../utils/api';
import { CONFIG } from '../constants/config';
import './CompanySelect.css';

const firm_colors = {
  "삼성증권": "#0052A4", "미래에셋증권": "#FF6B00", "키움증권": "#9B218B",
  "NH투자증권": "#004098", "KB증권": "#FFCC00", "신한증권": "#0046FF",
  "한국투자증권": "#000000", "하나증권": "#00918E", "토스증권": "#2461FF"
};

/** /external/api/companies API에서 증권사 목록을 가져온다 (하드코딩 대체) */
function useFirmOptions() {
  const [firms, setFirms] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await request(CONFIG.API.COMPANIES_URL, { skipAuth: true });
        if (cancelled || !Array.isArray(data)) return;
        const mapped = data.map((item, idx) => {
          const fallbackOrder = getFirmOrderByName(item.name);
          return {
            order: fallbackOrder !== null ? fallbackOrder : idx,
            name: item.name,
            report_count: item.report_count,
          };
        });
        // report_count 내림차순 정렬 (ALL 제외)
        mapped.sort((a, b) => b.report_count - a.report_count);
        if (!cancelled) setFirms(mapped);
      } catch { /* API 실패 시 하드코딩 fallback 없음 - 빈 목록 */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return firms;
}

function CompanySelect({ value, onChange, className = '' }) {
  const { isOpen, searchTerm, setSearchTerm, toggleOverlay, closeOverlay } = useGridOverlay();
  const firms = useFirmOptions();
  const selectedValue = value === null || value === undefined ? '' : value.toString();

  const selectedName = hasGridSelection(value) ? (getFirmNameByOrder(value) || "증권사 필터") : "증권사 필터";

  const handleSelect = (idx) => {
    const nextValue = idx === null || idx === undefined ? '' : idx.toString();
    if (nextValue !== selectedValue) {
      onChange({ target: { value: nextValue } });
    }
    closeOverlay();
  };

  const filteredFirms = firms.filter(item =>
    item.name.includes(searchTerm)
  );

  const overlay = (
    <div className="grid-overlay-portal company-grid-overlay">
      <div className="grid-overlay-header">
        <div className="grid-header-top">
          <h3>증권사 선택</h3>
          <button className="grid-close-btn" onClick={closeOverlay}>
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
            className={`checker-item all ${selectedValue === "" ? 'active' : ''}`}
            onClick={() => handleSelect("")}
          >
            <div className="checker-icon">ALL</div>
            <div className="checker-name">전체보기</div>
          </div>

          {filteredFirms.map(({ name, order }) => {
            const initial = name.substring(0, 1);
            const themeColor = firm_colors[name] || '#666';

            return (
              <div
                key={order}
                className={`checker-item ${selectedValue === order.toString() ? 'active' : ''}`}
                onClick={() => handleSelect(order)}
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
    <div className={`company-grid-container ${className}`.trim()}>
      <button type="button" className={`grid-trigger-btn ${hasGridSelection(value) ? 'selected' : ''}`} onClick={toggleOverlay}>
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

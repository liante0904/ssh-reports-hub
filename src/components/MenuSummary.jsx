import React from 'react';
import './MenuSummary.css';

/**
 * 메뉴 요약정보 공통 컴포넌트
 * @param {string} menuName - 현재 메뉴명 (예: "레포트 홈", "키워드 관리")
 * @param {Array} summaryItems - 요약 항목 배열 [{label: string, value: string|number, icon?: string}]
 * @param {string} variant - 스타일 변형 ('default' | 'compact')
 */
function MenuSummary({ menuName, summaryItems = [], variant = 'default' }) {
  return (
    <div className={`menu-summary ${variant}`}>
      <h2 className="menu-summary-title">{menuName}</h2>
      {summaryItems.length > 0 && (
        <div className="menu-summary-items">
          {summaryItems.map((item, index) => (
            <span key={index} className="menu-summary-item">
              {item.icon && <span className="menu-summary-icon">{item.icon}</span>}
              <span className="menu-summary-label">{item.label}</span>
              <span className="menu-summary-value">{item.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default MenuSummary;

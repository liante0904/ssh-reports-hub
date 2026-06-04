import React, { useId } from 'react';
import './MenuSummary.css';

/**
 * 메뉴 요약정보 공통 컴포넌트
 * @param {string} menuName - 현재 메뉴명 (예: "레포트 홈", "키워드 관리")
 * @param {string} description - 메뉴 설명
 * @param {Array} summaryItems - 요약 항목 배열 [{label: string, value: string|number, icon?: string}]
 * @param {string} variant - 스타일 변형 ('default' | 'compact')
 */
function MenuSummary({ menuName, description = '', summaryItems = [], variant = 'default' }) {
  const titleId = useId();

  return (
    <section className={`menu-summary ${variant}`} aria-labelledby={titleId}>
      <header className="menu-summary-heading">
        <h2 id={titleId} className="menu-summary-title">{menuName}</h2>
        {description && <p className="menu-summary-description">{description}</p>}
      </header>
      {summaryItems.length > 0 && (
        <ul className="menu-summary-items" aria-label={`${menuName} 요약`}>
          {summaryItems.map((item, index) => (
            <li key={index} className="menu-summary-item">
              {item.icon && <span className="menu-summary-icon">{item.icon}</span>}
              <span className="menu-summary-label">{item.label}</span>
              <span className="menu-summary-value">{item.value}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default MenuSummary;

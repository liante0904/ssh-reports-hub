import React from 'react';
import ReportItem from './ReportItem';

function ReportGroup({ 
  date, 
  items, 
  isCollapsed, 
  onToggleDate, 
  sortBy, 
  isFavoritesPage, 
  favorites, 
  firmToggles, 
  onToggleFirm, 
  summaryToggles, 
  onToggleSummary, 
  onToggleFavorite, 
  onOpenShareMenu, 
  onWriterClick,
  showSortOptions,
  setSortBy
}) {
  const isTimeSort = sortBy === 'time' || isFavoritesPage || Array.isArray(items);

  return (
    <div className="date-group">
      <div className="date-header">
        <div 
          className={`date-title ${!isCollapsed ? 'expanded' : ''}`} 
          onClick={() => onToggleDate(date)}
        >
          {date}
        </div>
        {showSortOptions && (
          <div className="sort-options">
            <button 
              className={`sort-btn ${sortBy === 'time' ? 'active' : ''}`} 
              onClick={() => setSortBy('time')}
            >
              시간순
            </button>
            <button 
              className={`sort-btn ${sortBy === 'company' ? 'active' : ''}`} 
              onClick={() => setSortBy('company')}
            >
              회사별
            </button>
          </div>
        )}
      </div>

      <div className={`company-group-wrapper ${isCollapsed ? 'collapsed' : ''}`}>
        {isTimeSort ? (
          /* 평탄화 리스트 (시간순, 즐겨찾기, 또는 데이터가 아직 배열인 경우) */
          <div className="report-wrapper">
            {(Array.isArray(items) ? items : Object.values(items).flat())
              .filter(r => !isFavoritesPage || favorites[r.id])
              .map(report => (
                <ReportItem 
                  key={report.id}
                  report={report}
                  isFavorite={!!favorites[report.id]}
                  isSummaryExpanded={summaryToggles[report.id]}
                  onToggleFavorite={onToggleFavorite}
                  onToggleSummary={onToggleSummary}
                  onOpenShareMenu={onOpenShareMenu}
                  showFirmTag={true}
                  onWriterClick={onWriterClick}
                />
              ))
            }
          </div>
        ) : (
          /* 증권사별 그룹화 리스트 (회사별 모드 + 데이터가 객체인 경우) */
          Object.entries(items).map(([firm, firmReports]) => (
            <div className="company-group" key={firm}>
              <div 
                className={`company-title ${!firmToggles[date]?.[firm] ? 'expanded' : ''}`} 
                onClick={() => onToggleFirm(date, firm)}
              >
                {firm}
              </div>
              <div className={`report-wrapper ${firmToggles[date]?.[firm] ? 'collapsed' : ''}`}>
                {Array.isArray(firmReports) ? firmReports.map(report => (
                  <ReportItem 
                    key={report.id}
                    report={report}
                    isFavorite={!!favorites[report.id]}
                    isSummaryExpanded={summaryToggles[report.id]}
                    onToggleFavorite={onToggleFavorite}
                    onToggleSummary={onToggleSummary}
                    onOpenShareMenu={onOpenShareMenu}
                    showFirmTag={false}
                    onWriterClick={onWriterClick}
                  />
                )) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ReportGroup;

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getShareUrl, getDirectUrl } from '../../utils/reportLinks';
import { useReport } from '../../context/ReportContext';

const ReportItem = ({ 
  report, 
  isFavorite, 
  isSummaryExpanded, 
  onToggleFavorite, 
  onToggleSummary, 
  onOpenShareMenu,
  showFirmTag,
  onWriterClick
}) => {
  const { id, title, writer, gemini_summary, firm, link } = report;
  const { setViewerReport } = useReport();
  
  const finalLink = getDirectUrl(report);
  
  const hasSummary = gemini_summary && gemini_summary.trim() !== "" && gemini_summary.trim() !== " ";

  return (
    <div className={`report-container-item ${hasSummary ? 'has-summary' : ''}`} key={id}>
      <div className="report">
        <div className="report-content">
          <div className="report-header">
            {showFirmTag && <span className="firm-tag">{firm}</span>}
            <div className="report-title-container">
              <a href={finalLink} target="_blank" rel="noopener noreferrer" className="report-title">
                {title}
              </a>
              {hasSummary && (
                <span className="ai-badge" onClick={() => onToggleSummary(id)}>
                  AI 요약
                </span>
              )}
            </div>
          </div>
          <div className="report-footer">
            <p className="report-writer" onClick={() => onWriterClick?.(writer)} style={{cursor: onWriterClick ? 'pointer' : 'default'}}>
              작성자: {writer} <span className="writer-search-icon">🔍</span>
            </p>
            <div className="report-actions">
              {hasSummary && (
                <button 
                  className={`summary-toggle-btn ${isSummaryExpanded ? 'active' : ''}`}
                  onClick={() => onToggleSummary(id)}
                >
                  {isSummaryExpanded ? '요약 닫기' : 'AI 요약 보기'}
                  <svg className="chevron-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                  </svg>
                </button>
              )}
              <button 
                className={`favorite-button ${isFavorite ? 'active' : ''}`}
                onClick={() => onToggleFavorite(id)}
                title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d={isFavorite 
                    ? "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                    : "M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"}
                  />
                </svg>
              </button>
              <button 
                className="viewer-button" 
                onClick={() => setViewerReport(report)}
                title="인앱 뷰어로 즉시 보기"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              </button>
              <button 
                className="share-button" 
                onClick={(e) => onOpenShareMenu(e, report)}
                title="공유하기"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      {hasSummary && (
        <div className={`summary-content ${isSummaryExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="summary-inner">
            <div className="summary-title-row">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--primary-color)" style={{marginRight: '6px'}}>
                <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/>
              </svg>
              AI 핵심 요약
            </div>
            <div className="summary-text">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {gemini_summary}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportItem;

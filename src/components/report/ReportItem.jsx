import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function ReportItem({ 
  report, 
  isFavorite, 
  isSummaryExpanded, 
  onToggleFavorite, 
  onToggleSummary, 
  onOpenShareMenu 
}) {
  const { id, title, writer, link, gemini_summary, firm } = report;
  
  const isDsSec = link && link.includes('ds-sec.co.kr');
  const fileName = `[${firm}] ${title}.pdf`;
  const finalLink = isDsSec 
    ? `${window.location.origin}/share-proxy/report.pdf?url=${encodeURIComponent(link)}&filename=${encodeURIComponent(fileName)}`
    : link;
  
  const hasSummary = gemini_summary && gemini_summary.trim() !== "" && gemini_summary.trim() !== " ";

  return (
    <div className={`report-container-item ${hasSummary ? 'has-summary' : ''}`}>
      <div className="report">
        <div className="report-content">
          <div className="report-header">
            <a href={finalLink} target="_blank" rel="noopener noreferrer">
              {title}
            </a>
            {hasSummary && (
              <span className="ai-badge" onClick={() => onToggleSummary(id)}>
                AI 요약
              </span>
            )}
          </div>
          
          <div className="report-meta">
            <p className="report-writer">작성자: {writer}</p>
            <div className="report-actions">
              <button 
                className={`favorite-button ${isFavorite ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(id);
                }}
                title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill={isFavorite ? '#FFD700' : 'none'} stroke={isFavorite ? '#FFD700' : 'currentColor'} strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
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
}

export default ReportItem;

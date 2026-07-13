import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getDirectUrl, prefetchPdf } from '../../utils/reportLinks';
import { useReport } from '../../context/useReport';

const ReportItem = ({ 
  report, 
  isFavorite, 
  isSummaryExpanded, 
  onToggleFavorite, 
  onToggleSummary, 
  onOpenShareMenu,
  showFirmTag,
  onWriterClick,
  isAdmin,
  onTriggerSummary,
  summaryRequestedIds,
  summaryCompletedIds
}) => {
  const {
    id, title, writer, gemini_summary, fnguide_summary, firm, pdf_file_url,
    tags, stock_names, stock_tickers, sector, target_price, rating, revision_type,
    report_type
  } = report;
  const { setViewerReport, telegramUser, llmVisibility } = useReport();
  const [showConfirm, setShowConfirm] = useState(null);
  /* 기존 주석 유지: 요약 요청 및 완료 여부 파악 */
  const isSummaryRequested = summaryRequestedIds?.has(id);
  const isSummaryCompleted = summaryCompletedIds?.has(id);
  
  /* 글래스모피즘 토스트 전용 컴포넌트 상태 정의 */
  const [toast, setToast] = useState({ visible: false, message: '' });
  
  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 3000);
  };
  
  const finalLink = getDirectUrl(report);

  const handleViewerClick = () => {
    if (firm === '현대차증권' && pdf_file_url) {
      setViewerReport({ ...report, link: pdf_file_url });
    } else {
      setViewerReport(report);
    }
  };

  // 프리패치 로직: 서버 미리 깨우기 (Cold Start 방지)
  const handlePrefetch = () => {
    const origin = window.location.origin;
    // 람다만 깨우면 되므로 복잡한 인자 생략
    const proxyUrl = `${origin}/.netlify/functions/proxy?warmup=true`;
    const shareUrl = `${origin}/.netlify/functions/share?warmup=true`;
    
    fetch(proxyUrl, { method: 'HEAD', mode: 'no-cors' }).catch(() => {});
    fetch(shareUrl, { method: 'HEAD', mode: 'no-cors' }).catch(() => {});

    prefetchPdf(report, origin);
  };
  
  // LLM 요약 노출 범위에 따른 판단 (기존 주석 유지 및 추가 권한 마스킹)
  const isLlmSummaryVisible = () => {
    const rawHasSummary = gemini_summary && gemini_summary.trim() !== "" && gemini_summary.trim() !== " ";
    if (!rawHasSummary) return false;
    
    // 설정 범위에 따른 마스킹 처리
    if (llmVisibility === 'admin') {
      return !!isAdmin;
    }
    if (llmVisibility === 'telegram') {
      return !!telegramUser;
    }
    // 기본적으로는 관리자만 노출
    return !!isAdmin;
  };

  const hasSummary = isLlmSummaryVisible();
  const hasFnguideSummary = !!fnguide_summary?.summary_text?.trim();
  const hasAnySummary = hasSummary || hasFnguideSummary;
  const hasDirectSignal = Boolean(target_price || rating || revision_type || report_type || stock_tickers?.length);
  const formattedTargetPrice = Number.isFinite(Number(target_price)) && Number(target_price) > 0
    ? Number(target_price).toLocaleString('ko-KR')
    : null;

  return (
    <div className={`report-container-item ${hasAnySummary ? 'has-summary' : ''}`} key={id}>
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
              {hasFnguideSummary && (
                <span className="ai-badge fnguide-badge-title" onClick={() => onToggleSummary(id)} style={{ backgroundColor: '#2e7d32', marginLeft: '6px' }}>
                  FnGuide 요약
                </span>
              )}
            </div>
          </div>
          {hasDirectSignal && (
            <div className="report-signals" aria-label="리포트 투자 신호">
              {rating && <span className="signal signal-rating">의견 {rating}</span>}
              {formattedTargetPrice && <span className="signal signal-target">목표가 {formattedTargetPrice}</span>}
              {revision_type && <span className="signal signal-revision">{revision_type}</span>}
              {report_type && <span className="signal signal-type">{report_type}</span>}
              {stock_tickers?.slice(0, 3).map((ticker) => (
                <span key={`ticker-${ticker}`} className="signal signal-ticker">{ticker}</span>
              ))}
            </div>
          )}
          {(tags && tags.length > 0 || stock_names && stock_names.length > 0 || sector) && (
            <div className="report-tags">
              {sector && <span className="tag tag-sector">{sector}</span>}
              {stock_names && stock_names.slice(0, 3).map((s, i) => (
                <span key={`stock-${i}`} className="tag tag-stock">{s}</span>
              ))}
              {tags && tags
                .filter(t => t !== sector && !stock_names?.includes(t))
                .slice(0, 5)
                .map((t, i) => (
                  <span key={`tag-${i}`} className="tag tag-keyword">{t}</span>
                ))}
            </div>
          )}
          
          {/* 관리자 요약 요청 버튼 영역 (report-tags 아래 배치하여 가시성 및 사용성 개선) */}
          {isAdmin && (
            <div className="admin-summary-section" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-color-secondary, #888)', fontWeight: 'bold' }}>AI 요약 요청:</span>
              {!isSummaryRequested && !isSummaryCompleted && (
                <span className="admin-summary-confirm">
                  <button 
                    className={`admin-summary-btn deepseek-btn ${showConfirm === 'deepseek' ? 'active' : ''}`}
                    onClick={() => setShowConfirm(showConfirm === 'deepseek' ? null : 'deepseek')}
                    title={hasSummary ? "DeepSeek AI 요약 재처리 요청" : "DeepSeek AI 요약 생성"}
                  >
                    <span className="summary-btn-icon" style={{ fontSize: '14px', fontWeight: '900', lineHeight: 1, marginRight: '2px' }}>!</span>
                    <span>DeepSeek</span>
                  </button>
                  <button 
                    className={`admin-summary-btn antigravity-btn ${showConfirm === 'ag' ? 'active' : ''}`}
                    onClick={() => setShowConfirm(showConfirm === 'ag' ? null : 'ag')}
                    title={hasSummary ? "Gemini AI 요약 재처리 요청" : "Gemini AI 요약 생성"}
                  >
                    <span className="summary-btn-icon" style={{ fontSize: '11px', lineHeight: 1, marginRight: '2px' }}>▲</span>
                    <span>Gemini</span>
                  </button>
                  {showConfirm && (
                    <span className="admin-summary-confirm-btns-wrapper" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {hasSummary && (
                        <span className="re-summarize-tooltip" style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '50%',
                          transform: 'translateX(-50%) translateY(-6px)',
                          backgroundColor: 'rgba(0, 0, 0, 0.85)',
                          color: '#fff',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          zIndex: 10,
                          fontWeight: 'normal'
                        }}>
                          ⚠️ 이미 요약이 존재합니다. 재처리하시겠습니까?
                        </span>
                      )}
                      <span className="admin-summary-confirm-btns" style={{ display: 'inline-flex', gap: '4px' }}>
                        <button 
                          className="confirm-yes" 
                          onClick={() => { 
                            const engine = showConfirm; 
                            setShowConfirm(null); 
                            if (hasSummary) {
                              showToast("기존 요약이 존재하여 AI 재처리 요약을 요청합니다...");
                            } else {
                              showToast("AI 요약 요청을 시작합니다...");
                            }
                            onTriggerSummary(id, engine, hasSummary, report);
                          }}
                        >
                          ✓
                        </button>
                        <button className="confirm-no" onClick={() => setShowConfirm(null)}>✗</button>
                      </span>
                    </span>
                  )}
                </span>
              )}
              {isSummaryRequested && !isSummaryCompleted && (
                <span className="summary-requested-badge">요청됨</span>
              )}
              {isSummaryCompleted && (
                <span className="summary-completed-badge">✓</span>
              )}
            </div>
          )}
          
          {/* 요약 토글 버튼 영역 (태그 영역 아래 배치하여 작성자 뭉개짐 방지 및 개별 요약 가시성 증대) */}
          {hasAnySummary && (
            <div className="report-summary-buttons" style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {hasSummary && (
                <button 
                  className={`summary-toggle-btn ai-summary-btn ${isSummaryExpanded ? 'active' : ''}`}
                  onClick={() => onToggleSummary(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.82em',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: isSummaryExpanded ? 'linear-gradient(135deg, #6e8efb, #a777e3)' : 'rgba(110, 142, 251, 0.1)',
                    color: isSummaryExpanded ? '#fff' : '#6e8efb',
                    border: '1px solid rgba(110, 142, 251, 0.3)'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/>
                  </svg>
                  {isSummaryExpanded ? 'AI 요약 닫기 ▲' : 'AI 요약 보기 ▼'}
                </button>
              )}
              {hasFnguideSummary && (
                <button 
                  className={`summary-toggle-btn fnguide-summary-btn ${isSummaryExpanded ? 'active' : ''}`}
                  onClick={() => onToggleSummary(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.82em',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: isSummaryExpanded ? '#2e7d32' : 'rgba(46, 125, 50, 0.1)',
                    color: isSummaryExpanded ? '#fff' : '#2e7d32',
                    border: '1px solid rgba(46, 125, 50, 0.3)'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                  {isSummaryExpanded ? 'FnGuide 요약 닫기 ▲' : 'FnGuide 요약 보기 ▼'}
                </button>
              )}
            </div>
          )}

          <div className="report-footer">
            <p className="report-writer" onClick={() => onWriterClick?.(writer)} style={{cursor: onWriterClick ? 'pointer' : 'default'}}>
              작성자: {writer} <span className="writer-search-icon">🔍</span>
            </p>
            <div className="report-actions">
              <button 
                className="viewer-button" 
                onClick={handleViewerClick}
                onMouseEnter={handlePrefetch}
                onTouchStart={handlePrefetch}
                title="인앱 뷰어로 즉시 보기"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              </button>
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
      {hasAnySummary && (
        <div className={`summary-content ${isSummaryExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="summary-inner-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '12px', boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}>
            {hasSummary && (
              <div className="summary-inner" style={{ width: '100%', boxSizing: 'border-box' }}>
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
            )}
            
            {hasFnguideSummary && (
              <div className="summary-inner fnguide-summary-section" style={{ 
                borderTop: hasSummary ? '1px dashed var(--border-color, #e0e0e0)' : 'none', 
                paddingTop: hasSummary ? '14px' : '0',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <div className="summary-title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="#2e7d32" style={{marginRight: '6px'}}>
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                    <span style={{ fontWeight: 'bold' }}>FnGuide 요약</span>
                  </div>
                  <div className="fnguide-meta-badges" style={{ display: 'flex', gap: '6px' }}>
                    {fnguide_summary?.opinion && (
                      <span className={`fnguide-badge opinion-badge`} style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        backgroundColor: 'rgba(46, 125, 50, 0.1)',
                        color: '#2e7d32',
                        border: '1px solid rgba(46, 125, 50, 0.3)'
                      }}>
                        의견: {fnguide_summary?.opinion}
                      </span>
                    )}
                    {fnguide_summary?.target_price && fnguide_summary?.target_price !== '0' && fnguide_summary?.target_price !== '-' && (
                      <span className="fnguide-badge target-price-badge" style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        backgroundColor: 'rgba(123, 31, 162, 0.1)',
                        color: '#7b1fa2',
                        border: '1px solid rgba(123, 31, 162, 0.3)'
                      }}>
                        목표가: {fnguide_summary?.target_price}
                      </span>
                    )}
                  </div>
                </div>
                <div className="summary-text" style={{ marginTop: '8px', color: 'var(--text-color-secondary, #666)', fontSize: '13.5px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                  {fnguide_summary.summary_text}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 글래스모피즘 토스트 UI 렌더링 */}
      {toast.visible && (
        <div className={`toast-container ${toast.visible ? 'visible' : ''}`} style={{ transition: 'all 0.3s ease' }}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default ReportItem;

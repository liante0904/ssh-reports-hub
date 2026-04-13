import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ShareMenu from './ShareMenu';
import './ReportList.css';

// 개별 레포트 아이템 컴포넌트 (리팩토링)
const ReportItem = ({ report, toggleSummary, isSummaryExpanded, onShare, showFirmTag, onWriterClick }) => {
  const { id, title, writer, link, gemini_summary, firm } = report;
  
  const isDsSec = link && link.includes('ds-sec.co.kr');
  const fileName = `[${firm}] ${title}.pdf`;
  const finalLink = isDsSec 
    ? `${window.location.origin}/share-proxy/report.pdf?url=${encodeURIComponent(link)}&filename=${encodeURIComponent(fileName)}`
    : link;
  
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
                <span className="ai-badge" onClick={() => toggleSummary(id)}>
                  AI 요약
                </span>
              )}
            </div>
          </div>
          <div className="report-footer">
            <p className="report-writer" onClick={() => onWriterClick(writer)} style={{cursor: 'pointer'}}>
              작성자: {writer}
            </p>
            <div className="report-actions">
              {hasSummary && (
                <button 
                  className={`summary-toggle-btn ${isSummaryExpanded ? 'active' : ''}`}
                  onClick={() => toggleSummary(id)}
                >
                  {isSummaryExpanded ? '요약 닫기' : 'AI 요약 보기'}
                  <svg className="chevron-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                  </svg>
                </button>
              )}
              <button 
                className="share-button" 
                onClick={(e) => onShare(e, report)}
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

function ReportList({ searchQuery, sortBy, setSortBy, onWriterClick }) {
  const location = useLocation();
  const [reports, setReports] = useState({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [dateToggles, setDateToggles] = useState({});
  const [firmToggles, setFirmToggles] = useState({});
  const [summaryToggles, setSummaryToggles] = useState({});
  
  const abortControllerRef = useRef(null);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  // Sync refs with state
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  // 공유 메뉴 상태
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const BASE_URL = import.meta.env.VITE_ORACLE_REST_API;
  const TABLE_NAME = import.meta.env.VITE_TABLE_NAME;

  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    let apiUrl = `${BASE_URL}/${TABLE_NAME}`;

    if (location.pathname.includes('global')) {
      apiUrl += '/search/';
      params.append('mkt_tp', 'global');
    } else if (location.pathname.includes('industry')) {
      apiUrl += '/industry';
    } else {
      apiUrl += '/search/';
    }

    params.append('offset', offset);

    if (sortBy === 'company') {
      params.append('sort', 'company');
    }

    if (searchQuery.query && searchQuery.category) {
      params.append(searchQuery.category, searchQuery.query);
    }

    return `${apiUrl}?${params.toString()}`;
  }, [offset, searchQuery, location.pathname, BASE_URL, TABLE_NAME, sortBy]);

  const mergeReports = useCallback((prev, newItems) => {
    const updated = { ...prev };

    for (const item of newItems) {
      let rawDate = item.reg_dt ? item.reg_dt.trim() : 'Unknown';
      let date = rawDate;
      
      if (rawDate.length === 8 && /^\d+$/.test(rawDate)) {
        date = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
      } else {
        const match = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) date = match[1];
      }
      
      const firm = item.firm_nm ? item.firm_nm.trim() : 'Unknown';
      const report = {
        id: item.report_id,
        title: item.article_title,
        writer: item.writer,
        firm: firm,
        link: item.telegram_url || item.download_url || item.attach_url,
        gemini_summary: item.gemini_summary,
      };

      if (!updated[date]) updated[date] = [];

      const exists = updated[date].some((r) => r.id === report.id);
      if (!exists) updated[date].push(report);
    }

    return updated;
  }, []);

  const fetchReports = useCallback(async (isInitial = false) => {
    if (!hasMoreRef.current && !isInitial) return;
    if (isLoadingRef.current && !isInitial) return;

    if (isInitial && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    if (isInitial) abortControllerRef.current = controller;

    setIsLoading(true);
    isLoadingRef.current = true;

    const apiUrl = buildApiUrl();

    try {
      const res = await fetch(apiUrl, { signal: controller.signal });
      if (!res.ok) throw new Error('API 요청 실패');

      const { items, hasMore: apiHasMore } = await res.json();

      setReports((prev) => mergeReports(isInitial ? {} : prev, items));
      setOffset((prev) => (isInitial ? items.length : prev + items.length));
      
      setHasMore(apiHasMore);
      hasMoreRef.current = apiHasMore;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('❌ Error fetching reports:', err);
    } finally {
      if (!isInitial || abortControllerRef.current === controller) {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, [buildApiUrl, mergeReports, sortBy]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setReports({});
    setOffset(0);
    setHasMore(true);
    hasMoreRef.current = true;
    setDateToggles({});
    setFirmToggles({});
    setSummaryToggles({});
  }, [searchQuery, location.pathname, sortBy]);

  useEffect(() => {
    if (offset === 0) fetchReports(true);
  }, [offset, fetchReports]);

  useEffect(() => {
    const reportDates = Object.keys(reports);
    if (reportDates.length === 0) return;

    const allCollapsed = reportDates.every(date => dateToggles[date] === true);
    if (allCollapsed && hasMore && !isLoading) fetchReports();
  }, [dateToggles, reports, hasMore, isLoading, fetchReports]);

  const toggleDate = (date) => {
    setDateToggles(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const toggleFirm = (date, firm) => {
    setFirmToggles(prev => ({
      ...prev,
      [date]: { ...prev[date], [firm]: !prev[date]?.[firm] }
    }));
  };

  const toggleSummary = (id) => {
    setSummaryToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShare = (e, report) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const shareUrl = `${window.location.origin}/share?id=${report.id}`;
    
    setMenuPosition({ 
      top: rect.bottom, 
      left: rect.left + rect.width / 2 
    });
    setSelectedReport({ ...report, shareUrl });
    setIsShareOpen(true);
  };

  const sortedDates = Object.keys(reports).sort((a, b) => b.localeCompare(a));
  const isSearchActive = !!(searchQuery.query || searchQuery.category === 'company');
  const isRecent = location.pathname === '/';

  return (
    <div className="report-list-wrapper">
      <div className="container" id="report-container">
        {offset === 0 && isLoading ? (
          <div className={`loading-overlay ${isSearchActive ? 'search-loading' : ''}`}>로딩 중...</div>
        ) : sortedDates.length === 0 ? null : (
          <InfiniteScroll
            dataLength={offset}
            next={fetchReports}
            hasMore={hasMore}
            scrollThreshold={0.6}
          >
            {sortedDates.map((date, index) => (
              <div className="date-group" key={date}>
                <div className="date-header">
                  <div className={`date-title ${!dateToggles[date] ? 'expanded' : ''}`} onClick={() => toggleDate(date)}>
                    {date}
                  </div>
                  {index === 0 && isRecent && !isSearchActive && (
                    <div className="sort-options">
                      <button className={`sort-btn ${sortBy === 'time' ? 'active' : ''}`} onClick={() => setSortBy('time')}>시간순</button>
                      <button className={`sort-btn ${sortBy === 'company' ? 'active' : ''}`} onClick={() => setSortBy('company')}>회사별</button>
                    </div>
                  )}
                </div>
                <div className={`company-group-wrapper ${dateToggles[date] ? 'collapsed' : ''}`}>
                  {sortBy === 'time' ? (
                    <div className="report-wrapper">
                      {reports[date].map(report => (
                        <ReportItem 
                          key={report.id}
                          report={report}
                          showFirmTag={true}
                          toggleSummary={toggleSummary}
                          isSummaryExpanded={summaryToggles[report.id]}
                          onShare={handleShare}
                        />
                      ))}
                    </div>
                  ) : (
                    /* 회사별 모드: 렌더링 시점에 그룹화 */
                    Object.entries(
                      reports[date].reduce((acc, report) => {
                        if (!acc[report.firm]) acc[report.firm] = [];
                        acc[report.firm].push(report);
                        return acc;
                      }, {})
                    ).map(([firm, firmReports]) => (
                      <div className="company-group" key={firm}>
                        <div className={`company-title ${!firmToggles[date]?.[firm] ? 'expanded' : ''}`} onClick={() => toggleFirm(date, firm)}>
                          {firm}
                        </div>
                        <div className={`report-wrapper ${firmToggles[date]?.[firm] ? 'collapsed' : ''}`}>
                          {firmReports.map(report => (
                            <ReportItem 
                              key={report.id}
                              report={report}
                              showFirmTag={false}
                              toggleSummary={toggleSummary}
                              isSummaryExpanded={summaryToggles[report.id]}
                              onShare={handleShare}
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </InfiniteScroll>
        )}
        {isLoading && hasMore && <div className={`loading-overlay ${isSearchActive ? 'search-loading' : ''}`}>로딩 중...</div>}
      </div>

      <ShareMenu 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        reportData={selectedReport}
        position={menuPosition}
      />
    </div>
  );
}

export default ReportList;

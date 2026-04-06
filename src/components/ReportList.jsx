import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ShareMenu from './ShareMenu';
import './ReportList.css'; // Assuming you have a CSS file for styles

function ReportList({ searchQuery }) {
  const location = useLocation();
  const [reports, setReports] = useState({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [dateToggles, setDateToggles] = useState({});
  const [firmToggles, setFirmToggles] = useState({});
  const [summaryToggles, setSummaryToggles] = useState({});
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('report_favorites');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  
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

    // pathname에 따라 URL 구조 다르게
    if (location.pathname.includes('global')) {
      apiUrl += '/search/';
      params.append('mkt_tp', 'global');
    } else if (location.pathname.includes('industry')) {
      apiUrl += '/industry';
      // industry는 search 제거
    } else {
      apiUrl += '/search/';
    }

    // 공통 파라미터
    params.append('offset', offset);

    if (searchQuery.query && searchQuery.category) {
      params.append(searchQuery.category, searchQuery.query);
    }

    return `${apiUrl}?${params.toString()}`;
  }, [offset, searchQuery, location.pathname, BASE_URL, TABLE_NAME]);

  const mergeReports = useCallback((prev, newItems) => {
    // 1. 전체 상태 깊은 복사 (날짜별 객체까지)
    const updated = { ...prev };

    for (const item of newItems) {
      let rawDate = item.reg_dt ? item.reg_dt.trim() : 'Unknown';
      let date = rawDate;
      
      // YYYYMMDD -> YYYY-MM-DD
      if (rawDate.length === 8 && /^\d+$/.test(rawDate)) {
        date = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
      } else {
        const match = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) {
          date = match[1];
        } else {
          const altMatch = rawDate.match(/^(\d{4}[./]\d{2}[./]\d{2})/);
          if (altMatch) {
            date = altMatch[1].replace(/\./g, '-').replace(/\//g, '-');
          }
        }
      }
      
      const firm = item.firm_nm ? item.firm_nm.trim() : 'Unknown';
      const report = {
        id: item.report_id,
        title: item.article_title,
        writer: item.writer,
        link: item.telegram_url || item.download_url || item.attach_url,
        gemini_summary: item.gemini_summary,
      };

      if (!updated[date]) {
        updated[date] = {};
      } else {
        updated[date] = { ...updated[date] };
      }

      if (!updated[date][firm]) {
        updated[date][firm] = [];
      } else {
        updated[date][firm] = [...updated[date][firm]];
      }

      const exists = updated[date][firm].some((r) => r.id === report.id);
      if (!exists) {
        updated[date][firm].push(report);
      }
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

    try {
      const res = await fetch(buildApiUrl(), { signal: controller.signal });
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
  }, [buildApiUrl, mergeReports]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setReports({});
    setOffset(0);
    setHasMore(true);
    hasMoreRef.current = true;
    setDateToggles({});
    setFirmToggles({});
    setSummaryToggles({});
  }, [searchQuery, location.pathname]);

  useEffect(() => {
    if (offset === 0) {
      fetchReports(true);
    }
  }, [offset, fetchReports]);

  useEffect(() => {
    const reportDates = Object.keys(reports);
    if (reportDates.length === 0) return;

    const allCollapsed = reportDates.every(date => dateToggles[date] === true);

    if (allCollapsed) {
      if (hasMore && !isLoading) {
        fetchReports();
      }
    }
  }, [dateToggles, reports, hasMore, isLoading, fetchReports]);

  const toggleDate = (date) => {
    setDateToggles(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const toggleFirm = (date, firm) => {
    setFirmToggles(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [firm]: !prev[date]?.[firm]
      }
    }));
  };

  const toggleSummary = (id) => {
    setSummaryToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('report_favorites', JSON.stringify(next));
      return next;
    });
  };

  const sortedDates = Object.keys(reports).sort((a, b) => b.localeCompare(a));

  const isSearchActive = !!(searchQuery.query || searchQuery.category === 'company');
  const isFavoritesPage = location.pathname.includes('favorites');

  // 즐겨찾기 페이지인 경우 데이터 필터링
  const filteredSortedDates = isFavoritesPage 
    ? sortedDates.filter(date => {
        const firms = reports[date];
        return Object.values(firms).some(firmReports => 
          firmReports.some(report => !!favorites[report.id])
        );
      })
    : sortedDates;
return (
  <div className="report-list-wrapper">
    <div className="container" id="report-container">
      {/* 최초 로딩 시에만 풀스크린 로딩 표시, 이후는 하단 로딩바만 표시 */}
      {offset === 0 && isLoading && Object.keys(reports).length === 0 ? (
        <div className={`loading-overlay ${isSearchActive ? 'search-loading' : ''}`}>로딩 중...</div>
      ) : isFavoritesPage && filteredSortedDates.length === 0 && !isLoading ? (
        <div className="empty-favorites">
          <div className="empty-icon">★</div>
          <p>즐겨찾기한 레포트가 없습니다.<br/>관심 있는 레포트에 별표를 눌러보세요!</p>
        </div>
      ) : filteredSortedDates.length === 0 && !isLoading ? null : (
        <InfiniteScroll
          dataLength={offset}
          next={fetchReports}
          hasMore={isFavoritesPage ? false : hasMore}
          scrollThreshold={0.6}
          loader={isLoading && <div className="bottom-loading">더 불러오는 중...</div>}
        >
          {filteredSortedDates.map((date) => {
...
              const firmsAtDate = reports[date];
              const filteredFirms = Object.entries(firmsAtDate).reduce((acc, [firm, firmReports]) => {
                const favReports = isFavoritesPage 
                  ? firmReports.filter(r => !!favorites[r.id])
                  : firmReports;
                
                if (favReports.length > 0) acc[firm] = favReports;
                return acc;
              }, {});

              if (Object.keys(filteredFirms).length === 0) return null;

              return (
                <div className="date-group" key={date}>
                  <div className={`date-title ${!dateToggles[date] ? 'expanded' : ''}`} onClick={() => toggleDate(date)}>
                    {date}
                  </div>
                  <div className={`company-group-wrapper ${dateToggles[date] ? 'collapsed' : ''}`}>
                    {Object.entries(filteredFirms).map(([firm, firmReports]) => (
                      <div className="company-group" key={firm}>
                        <div className={`company-title ${!firmToggles[date]?.[firm] ? 'expanded' : ''}`} onClick={() => toggleFirm(date, firm)}>
                          {firm}
                        </div>
                        <div className={`report-wrapper ${firmToggles[date]?.[firm] ? 'collapsed' : ''}`}>
                          {firmReports.map(({ id, title, writer, link, gemini_summary }) => {
                            const isDsSec = link && link.includes('ds-sec.co.kr');
                            const fileName = `[${firm}] ${title}.pdf`;
                            const finalLink = isDsSec 
                              ? `${window.location.origin}/share-proxy/report.pdf?url=${encodeURIComponent(link)}&filename=${encodeURIComponent(fileName)}`
                              : link;
                            
                            const hasSummary = gemini_summary && gemini_summary.trim() !== "" && gemini_summary.trim() !== " ";
                            const isSummaryExpanded = summaryToggles[id];
                            const isFavorite = !!favorites[id];

                            return (
                              <div className={`report-container-item ${hasSummary ? 'has-summary' : ''}`} key={id}>
                                <div className="report">
                                  <button 
                                    className={`favorite-button ${isFavorite ? 'active' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(id);
                                    }}
                                    title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                                  >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill={isFavorite ? '#FFD700' : 'none'} stroke={isFavorite ? '#FFD700' : 'currentColor'} strokeWidth="2">
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
                                    </svg>
                                  </button>
                                  <div className="report-content">
                                    <div className="report-header">
                                      <a href={finalLink} target="_blank" rel="noopener noreferrer">
                                        {title}
                                      </a>
                                      {hasSummary && (
                                        <span className="ai-badge" onClick={() => toggleSummary(id)}>
                                          AI 요약
                                        </span>
                                      )}
                                    </div>
                                    <p>작성자: {writer}</p>
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
                                  </div>
                                  <button 
                                    className="share-button" 
                                    onClick={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const shareUrl = `${window.location.origin}/share?id=${id}`;
                                      
                                      setMenuPosition({ 
                                        top: rect.bottom, 
                                        left: rect.left + rect.width / 2 
                                      });
                                      setSelectedReport({ title, firm, shareUrl, writer });
                                      setIsShareOpen(true);
                                    }}
                                    title="공유하기"
                                  >
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                                    </svg>
                                  </button>
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
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </InfiniteScroll>
        )}
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

import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import ShareMenu from './ShareMenu';
import ReportItem from './report/ReportItem';
import { useReportFetch } from '../hooks/useReportFetch';
import { useReport } from '../context/ReportContext';
import './ReportList.css';

function ReportList({ onWriterClick }) {
  const { searchQuery, sortBy, setSortBy } = useReport();
  const location = useLocation();
  const { 
    reports, 
    isLoading, 
    hasMore, 
    offset, 
    fetchReports 
  } = useReportFetch(searchQuery, location.pathname, sortBy);

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

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const scroller = document.getElementById('main-content');
    if (scroller) scroller.scrollTo(0, 0);
    setDateToggles({});
    setFirmToggles({});
    setSummaryToggles({});
  }, [location.pathname, searchQuery, sortBy]);

  useEffect(() => {
    const reportDates = Object.keys(reports);
    if (reportDates.length === 0 && !isLoading) return;

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

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('report_favorites', JSON.stringify(next));
      return next;
    });
  };

  const handleOpenShareMenu = (e, report) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const shareUrl = `${window.location.origin}/share?id=${report.id}`;
    
    setMenuPosition({ 
      top: rect.bottom, 
      left: rect.left + rect.width / 2 
    });
    setSelectedReport({ 
      title: report.title, 
      firm: report.firm, 
      shareUrl, 
      writer: report.writer 
    });
    setIsShareOpen(true);
  };

  const sortedDates = Object.keys(reports).sort((a, b) => b.localeCompare(a));
  const isSearchActive = !!(searchQuery.query || searchQuery.category === 'company');
  const isFavoritesPage = location.pathname.includes('favorites');
  const isRecent = location.pathname === '/';

  // 필터링된 날짜 리스트 (즐겨찾기 페이지 대응)
  const filteredSortedDates = isFavoritesPage 
    ? sortedDates.filter(date => {
        const items = reports[date];
        if (Array.isArray(items)) {
          return items.some(report => !!favorites[report.id]);
        }
        return Object.values(items).some(firmReports => 
          firmReports.some(report => !!favorites[report.id])
        );
      })
    : sortedDates;

  return (
    <div className="report-list-wrapper">
      <div className="container" id="report-container">
        {offset === 0 && isLoading ? (
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
          >
            {filteredSortedDates.map((date, index) => {
              const itemsAtDate = reports[date];
              
              // 시간순(배열) 또는 회사별(객체) 처리
              return (
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
                    {sortBy === 'time' || isFavoritesPage || Array.isArray(itemsAtDate) ? (
                      /* 평탄화 리스트 (시간순, 즐겨찾기, 또는 데이터가 아직 배열인 경우) */
                      <div className="report-wrapper">
                        {(Array.isArray(itemsAtDate) ? itemsAtDate : Object.values(itemsAtDate).flat())
                          .filter(r => !isFavoritesPage || favorites[r.id])
                          .map(report => (
                            <ReportItem 
                              key={report.id}
                              report={report}
                              isFavorite={!!favorites[report.id]}
                              isSummaryExpanded={summaryToggles[report.id]}
                              onToggleFavorite={toggleFavorite}
                              onToggleSummary={toggleSummary}
                              onOpenShareMenu={handleOpenShareMenu}
                              showFirmTag={true}
                              onWriterClick={onWriterClick}
                            />
                          ))
                        }
                      </div>
                    ) : (
                      /* 증권사별 그룹화 리스트 (회사별 모드 + 데이터가 객체인 경우) */
                      Object.entries(itemsAtDate).map(([firm, firmReports]) => (
                        <div className="company-group" key={firm}>
                          <div className={`company-title ${!firmToggles[date]?.[firm] ? 'expanded' : ''}`} onClick={() => toggleFirm(date, firm)}>
                            {firm}
                          </div>
                          <div className={`report-wrapper ${firmToggles[date]?.[firm] ? 'collapsed' : ''}`}>
                            {Array.isArray(firmReports) ? firmReports.map(report => (
                              <ReportItem 
                                key={report.id}
                                report={report}
                                isFavorite={!!favorites[report.id]}
                                isSummaryExpanded={summaryToggles[report.id]}
                                onToggleFavorite={toggleFavorite}
                                onToggleSummary={toggleSummary}
                                onOpenShareMenu={handleOpenShareMenu}
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
            })}
          </InfiniteScroll>
        )}
        {isLoading && hasMore && <div className="loading-overlay">로딩 중...</div>}
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

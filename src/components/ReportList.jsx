import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import ShareMenu from './ShareMenu';
import { ReportItem } from './report/ReportItem';
import { useReportFetch } from '../hooks/useReportFetch';
import { useReport } from '../context/ReportContext';
import './ReportList.css';

function ReportList() {
  const { searchQuery } = useReport();
  const location = useLocation();
  const { 
    reports, 
    isLoading, 
    hasMore, 
    offset, 
    fetchReports 
  } = useReportFetch(searchQuery, location.pathname);

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

  // 공유 메뉴 상태
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    window.scrollTo(0, 0);
    setDateToggles({});
    setFirmToggles({});
    setSummaryToggles({});
  }, [searchQuery, location.pathname]);

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
            loader={isLoading && <div className="bottom-loading">더 불러오는 중...</div>}
          >
            {filteredSortedDates.map((date) => {
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
                          {firmReports.map((report) => (
                            <ReportItem 
                              key={report.id}
                              report={report}
                              isFavorite={!!favorites[report.id]}
                              isSummaryExpanded={summaryToggles[report.id]}
                              onToggleFavorite={toggleFavorite}
                              onToggleSummary={toggleSummary}
                              onOpenShareMenu={handleOpenShareMenu}
                            />
                          ))}
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

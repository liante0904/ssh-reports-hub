import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import ShareMenu from './ShareMenu';
import ReportGroup from './report/ReportGroup';
import { useReportFetch } from '../hooks/useReportFetch';
import { useReport } from '../context/useReport';
import { request } from '../utils/api';
import { CONFIG } from '../constants/config';
import { getReportSectionByPath } from '../constants/reportSections';
import { isDsReport, prefetchPdf } from '../utils/reportLinks';
import { normalizeReportItem } from '../utils/reportNormalizer';
import { buildShareMenuData } from '../utils/shareMenuData';
import MenuSummary from './MenuSummary';
import './ReportList.css';

const SUMMARY_NOTIFICATION_EVENT = 'ssh-summary-notification';

function emitSummaryNotification(detail) {
  window.dispatchEvent(new CustomEvent(SUMMARY_NOTIFICATION_EVENT, {
    detail: {
      created_at: new Date().toISOString(),
      ...detail,
    },
  }));
}

function ReportList({ onWriterClick }) {
  const { searchQuery, sortBy, setSortBy, telegramUser, handleSearch } = useReport();
  const isAdmin = telegramUser?.is_admin === true;
  const location = useLocation();
  const isOutlook = location.pathname.includes('outlook');
  const [outlookYear, setOutlookYear] = useState(null);
  const { 
    reports, 
    isLoading, 
    hasMore, 
    offset, 
    fetchReports 
  } = useReportFetch(searchQuery, location.pathname, outlookYear, sortBy);

  const [collapsedDates, setCollapsedDates] = useState({});
  const [collapsedFirms, setCollapsedFirms] = useState({});
  const [expandedSummaries, setExpandedSummaries] = useState({});
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('report_favorites');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 즐겨찾기 페이지 전용: 서버에서 tbl_sec_reports와 JOIN된 풀 리포트 데이터
  const [favoriteReports, setFavoriteReports] = useState(null);

  // 로그인 시 로컬 즐겨찾기를 서버로 업로드 후 동기화
  useEffect(() => {
    if (!telegramUser) return;
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return;

    const baseUrl = CONFIG.API.BASE_URL;
    const LOCAL_KEY = 'report_favorites';
    const SYNC_FLAG_KEY = 'report_favorites_synced';

    // 이미 동기화한 적 있으면 서버 데이터만 가져옴 (로컬과 병합)
    if (localStorage.getItem(SYNC_FLAG_KEY)) {
      request(`${baseUrl}/favorites`, { skipAuth: false })
        .then(data => {
          if (data?.items) {
            const serverFavs = {};
            data.items.forEach(f => { serverFavs[f.report_id] = true; });
            setFavorites(prev => {
              const merged = { ...prev, ...serverFavs };
              localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
              return merged;
            });
          }
        })
        .catch(() => {});
      return;
    }

    // 로컬에 저장된 즐겨찾기를 서버로 업로드
    const localSaved = localStorage.getItem(LOCAL_KEY);
    let localFavs = {};
    try {
      localFavs = localSaved ? JSON.parse(localSaved) : {};
    } catch {
      localFavs = {};
    }

    const reportIds = Object.keys(localFavs).filter(id => localFavs[id]).map(Number);
    if (reportIds.length > 0) {
      Promise.allSettled(
        reportIds.map(id =>
          request(`${baseUrl}/favorites/${id}`, { method: 'POST', skipAuth: false })
        )
      ).then(() => {
        // 업로드 완료 후 서버 데이터로 갱신 (로컬과 병합)
        request(`${baseUrl}/favorites`, { skipAuth: false })
          .then(data => {
            if (data?.items) {
              const serverFavs = {};
              data.items.forEach(f => { serverFavs[f.report_id] = true; });
              setFavorites(prev => {
                const merged = { ...prev, ...serverFavs };
                localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
                return merged;
              });
            }
          })
          .catch(() => {});
      });
    } else {
      // 업로드할 게 없어도 서버 데이터로 갱신 (로컬과 병합)
      request(`${baseUrl}/favorites`, { skipAuth: false })
        .then(data => {
          if (data?.items) {
            const serverFavs = {};
            data.items.forEach(f => { serverFavs[f.report_id] = true; });
            setFavorites(prev => {
              const merged = { ...prev, ...serverFavs };
              localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
              return merged;
            });
          }
        })
        .catch(() => {});
    }

    // 동기화 완료 플래그 (재실행 방지)
    localStorage.setItem(SYNC_FLAG_KEY, '1');
  }, [telegramUser?.id]);

  // 즐겨찾기 페이지 진입 시 서버에서 tbl_sec_reports와 JOIN된 풀 리포트 데이터 조회
  useEffect(() => {
    if (!location.pathname.includes('favorites')) return;
    if (!telegramUser) return;
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return;

    const baseUrl = CONFIG.API.BASE_URL;
    const LOCAL_KEY = 'report_favorites';

    request(`${baseUrl}/favorites`, { skipAuth: false })
      .then(data => {
        if (!data?.items) return;

        // (A) favorites 상태 업데이트 (report_id 기준)
        const serverFavs = {};
        data.items.forEach(item => { serverFavs[item.report_id] = true; });
        setFavorites(prev => {
          const merged = { ...prev, ...serverFavs };
          localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
          return merged;
        });

        // (B) 서버가 tbl_sec_reports와 JOIN한 풀 리포트 데이터 정규화
        const normalizedItems = data.items
          .map(item => normalizeReportItem(item))
          .filter(Boolean);

        if (normalizedItems.length === 0) {
          setFavoriteReports({});
          return;
        }

        // 날짜별 그룹핑 (useReportFetch의 mergeReports 로직과 동일하게)
        const grouped = {};
        normalizedItems.forEach(report => {
          const { date } = report;
          if (!grouped[date] || !Array.isArray(grouped[date])) grouped[date] = [];
          const exists = grouped[date].some(r => r.id === report.id);
          if (!exists) grouped[date].push(report);
        });
        setFavoriteReports(grouped);
      })
      .catch(() => {});
  }, [location.pathname, telegramUser?.id]);

  const [summaryRequestedIds, setSummaryRequestedIds] = useState(new Set());
  const [summaryCompletedIds, setSummaryCompletedIds] = useState(new Set());
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    window.scrollTo(0, 0);
    setCollapsedDates({});
    setCollapsedFirms({});
    setExpandedSummaries({});
    setSummaryRequestedIds(new Set());
  }, [location.pathname, searchQuery, sortBy]);

  // 모든 날짜 그룹이 닫혀있고 다음 데이터가 있다면 자동으로 더 불러오기
  useEffect(() => {
    const reportDates = Object.keys(reports || {});
    if (reportDates.length === 0 && !isLoading) return;

    const allCollapsed = reportDates.every(date => collapsedDates[date] === true);
    if (allCollapsed && hasMore && !isLoading) fetchReports();
  }, [collapsedDates, reports, hasMore, isLoading, fetchReports]);

  const toggleDate = (date) => {
    setCollapsedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const toggleFirm = (date, firm) => {
    setCollapsedFirms(prev => ({
      ...prev,
      [date]: { ...prev[date], [firm]: !prev[date]?.[firm] }
    }));
  };

  const toggleSummary = (id) => {
    setExpandedSummaries(prev => ({ ...prev, [id]: !prev[id] }));
  };


  const toggleFavorite = (id) => {
    const baseUrl = CONFIG.API.BASE_URL;
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);

    setFavorites(prev => {
      const isAdding = !prev[id];
      const next = { ...prev, [id]: isAdding };
      localStorage.setItem('report_favorites', JSON.stringify(next));

      // 로그인 상태면 서버에도 반영
      if (token && telegramUser) {
        const method = isAdding ? 'POST' : 'DELETE';
        request(`${baseUrl}/favorites/${id}`, {
          method,
          skipAuth: false,
        }).catch(() => {});
      }

      return next;
    });
  };

  const handleOpenShareMenu = (e, report) => {
    const rect = e.currentTarget.getBoundingClientRect();
    
    setMenuPosition({ 
      top: rect.bottom, 
      left: rect.left + rect.width / 2 
    });
    setSelectedReport(buildShareMenuData(report));
    setIsShareOpen(true);
  };

  const handleTriggerSummary = async (reportId, engine = 'deepseek', force = false, report = null) => {
    const baseUrl = CONFIG.API.BASE_URL;
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return;
    const title = report?.title || report?.article_title || `리포트 #${reportId}`;
    const firm = report?.firm || report?.firm_nm || '';
    const modelLabel = engine === 'ag' ? 'Gemini' : 'DeepSeek';

    /* 기존 주석 유지: 중복 요청 방지 (force=true일 때는 우회를 위해 상태 초기화) */
    if (force) {
      setSummaryCompletedIds(prev => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
      setSummaryRequestedIds(prev => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
    } else if (summaryRequestedIds.has(reportId)) {
      return;
    }
    
    setSummaryRequestedIds(prev => new Set(prev).add(reportId));
    emitSummaryNotification({
      report_id: reportId,
      article_title: title,
      firm_nm: firm,
      summary_model: engine === 'ag' ? 'gemini' : engine,
      status: 'requested',
      message: `${modelLabel} 요약 요청을 접수했습니다: ${title}`,
    });

    try {
      const url = `${baseUrl}/admin/reports/${reportId}/summarize?engine=${engine}${force ? '&force=true' : ''}`;
      const result = await request(url, {
        method: 'POST',
        skipAuth: false,
        timeout: 180000,
      });
      if (result?.status === 'success') {
        setSummaryCompletedIds(prev => new Set(prev).add(reportId));
        emitSummaryNotification({
          report_id: reportId,
          article_title: title,
          firm_nm: firm,
          summary_model: engine === 'ag' ? 'gemini' : engine,
          status: 'completed',
          message: `${modelLabel} 요약이 완료되었습니다: ${title}`,
        });
      } else if (result?.status === 'skipped') {
        setSummaryCompletedIds(prev => new Set(prev).add(reportId));
        emitSummaryNotification({
          report_id: reportId,
          article_title: title,
          firm_nm: firm,
          summary_model: engine === 'ag' ? 'gemini' : engine,
          status: 'skipped',
          message: `${modelLabel} 요약이 이미 완료되어 있습니다: ${title}`,
        });
      }
    } catch (error) {
      console.error('[Admin] ❌ 요청 실패:', error.message);
      // 실패 시 요청됨 해제 (재시도 가능)
      setSummaryRequestedIds(prev => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
      emitSummaryNotification({
        report_id: reportId,
        article_title: title,
        firm_nm: firm,
        summary_model: engine === 'ag' ? 'gemini' : engine,
        status: 'failed',
        message: `${modelLabel} 요약 요청에 실패했습니다: ${title}`,
      });
    }
  };

  const isSearchActive = !!(searchQuery.query || searchQuery.category === 'company');
  const isFavoritesPage = location.pathname.includes('favorites');
  const isAiSummary = location.pathname.includes('ai-summary');
  const isRecent = location.pathname === '/recent';

  const handleTagClick = (keyword) => {
    handleSearch({ query: keyword, category: 'tag' });
  };

  const sectionMeta = getReportSectionByPath(location.pathname);
  const menuTitle = sectionMeta?.title || '레포트';

  // 즐겨찾기 페이지: 서버 JOIN 데이터 우선, fallback으로 useReportFetch 데이터 사용
  const displayReports = isFavoritesPage && favoriteReports ? favoriteReports : reports;
  const sortedDates = Object.keys(displayReports || {}).sort((a, b) => b.localeCompare(a));

  const hasSummaryContent = (report) => {
    return report?.gemini_summary && report.gemini_summary.trim() !== "" && report.gemini_summary.trim() !== " ";
  };

  // 필터링된 날짜 리스트
  // 즐겨찾기 페이지(favoriteReports 사용 시): 서버에서 이미 tbl_sec_reports 기준으로 필터링됨
  // AI요약 페이지: summary 존재하는 날짜만
  const filteredSortedDates = isFavoritesPage && favoriteReports
    ? sortedDates  // 서버에서 이미 유효한 데이터만 보내줌
    : isFavoritesPage
    ? sortedDates.filter(date => {
        const items = displayReports?.[date] || [];
        if (Array.isArray(items)) {
          return items.some(report => !!favorites[report?.id]);
        }
        return Object.values(items || {}).some(firmReports => 
          Array.isArray(firmReports) && firmReports.some(report => !!favorites[report?.id])
        );
      })
    : isAiSummary
    ? sortedDates.filter(date => {
        const items = displayReports?.[date] || [];
        if (Array.isArray(items)) {
          return items.some(hasSummaryContent);
        }
        return Object.values(items || {}).some(firmReports =>
          Array.isArray(firmReports) && firmReports.some(hasSummaryContent)
        );
      })
    : sortedDates;

  useEffect(() => {
    if (isLoading || filteredSortedDates.length === 0) return;

    const topReports = filteredSortedDates
      .slice(0, 2)
      .flatMap((date) => {
        if (collapsedDates[date]) return [];
        const items = displayReports?.[date] || [];
        const list = Array.isArray(items) ? items : Object.values(items || {}).flat();
        return list.filter((report) => {
          if (isFavoritesPage && !favoriteReports && !favorites[report.id]) return false;
          if (isAiSummary && !hasSummaryContent(report)) return false;
          return true;
        });
      })
      .filter(isDsReport)
      .slice(0, 3);

    if (topReports.length === 0) return;

    const runPrefetch = () => {
      const origin = window.location.origin;
      topReports.forEach((report, index) => {
        window.setTimeout(() => prefetchPdf(report, origin), index * 700);
      });
    };

    if (window.requestIdleCallback) {
      const idleId = window.requestIdleCallback(runPrefetch, { timeout: 2500 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(runPrefetch, 1200);
    return () => window.clearTimeout(timeoutId);
  }, [collapsedDates, favorites, filteredSortedDates, isFavoritesPage, isLoading, reports]);

  return (
    <div className="report-list-wrapper">
      <div className="container" id="report-container">
        {/* 메뉴 요약정보 추가 */}
        <MenuSummary
          menuName={menuTitle}
          description={sectionMeta?.description}
          summaryItems={[
            ...(isFavoritesPage ? [{ label: '즐겨찾기', value: Object.keys(favorites).length, icon: '⭐' }] : []),
            ...(isAiSummary ? [{ label: 'AI 요약', value: filteredSortedDates.length, icon: '🤖' }] : []),
            ...(isOutlook ? [{ label: '전망', value: filteredSortedDates.length, icon: '🔮' }] : []),
            ...(sectionMeta && !isFavoritesPage && !isAiSummary && !isOutlook ? [{ label: menuTitle, value: filteredSortedDates.length, icon: '📰' }] : []),
            ...(searchQuery.query ? [{ label: '검색', value: searchQuery.query, icon: '🔍' }] : []),
          ]}
          variant="compact"
        />
        {isOutlook && !isLoading && (
          <div className="outlook-year-filter">
            <button
              className={`year-chip ${outlookYear === null ? 'active' : ''}`}
              onClick={() => setOutlookYear(null)}
            >전체</button>
            {[2026, 2025, 2024, 2023].map(year => (
              <button
                key={year}
                className={`year-chip ${outlookYear === year ? 'active' : ''}`}
                onClick={() => setOutlookYear(outlookYear === year ? null : year)}
              >{year}년</button>
            ))}
          </div>
        )}
        {isFavoritesPage && !favoriteReports && offset === 0 && isLoading ? (
          <div className={`loading-overlay ${isSearchActive ? 'search-loading' : ''}`}>로딩 중...</div>
        ) : isFavoritesPage && favoriteReports && Object.keys(favoriteReports).length === 0 && !isLoading ? (
          <div className="empty-favorites">
            <div className="empty-icon">★</div>
            <p>즐겨찾기한 레포트가 없습니다.<br/>관심 있는 레포트에 별표를 눌러보세요!</p>
          </div>
        ) : !isFavoritesPage && offset === 0 && isLoading ? (
          <div className={`loading-overlay ${isSearchActive ? 'search-loading' : ''}`}>로딩 중...</div>
        ) : isFavoritesPage && !favoriteReports && filteredSortedDates.length === 0 && !isLoading ? (
          <div className="empty-favorites">
            <div className="empty-icon">★</div>
            <p>즐겨찾기한 레포트가 없습니다.<br/>관심 있는 레포트에 별표를 눌러보세요!</p>
          </div>
        ) : isAiSummary && filteredSortedDates.length === 0 && !isLoading ? (
          <div className="empty-favorites">
            <div className="empty-icon">🤖</div>
            <p>AI 요약이 생성된 레포트가 없습니다.<br/>관리자가 요약을 생성하면 여기에 표시됩니다.</p>
          </div>
        ) : isOutlook && filteredSortedDates.length === 0 && !isLoading ? (
          <div className="empty-favorites">
            <div className="empty-icon">🔮</div>
            <p>전망 관련 레포트가 없습니다.<br/>2026년 하반기 전망 등 시장 전망 레포트가 여기에 표시됩니다.</p>
          </div>
        ) : filteredSortedDates.length === 0 && !isLoading ? null : (
          <InfiniteScroll
            dataLength={offset}
            next={fetchReports}
            hasMore={isFavoritesPage ? false : hasMore}
            scrollThreshold={0.6}
          >
            {filteredSortedDates.map((date, index) => (
              <ReportGroup 
                key={date}
                date={date}
                items={displayReports[date]}
                isCollapsed={!!collapsedDates[date]}
                onToggleDate={toggleDate}
                sortBy={sortBy}
                isFavoritesPage={isFavoritesPage}
                favorites={favorites}
                collapsedFirms={collapsedFirms}
                onToggleFirm={toggleFirm}
                expandedSummaries={expandedSummaries}
                onToggleSummary={toggleSummary}
                onToggleFavorite={toggleFavorite}
                onOpenShareMenu={handleOpenShareMenu}
                onWriterClick={onWriterClick}
                showSortOptions={index === 0 && isRecent && !isSearchActive}
                setSortBy={setSortBy}
                isAdmin={isAdmin}
                onTriggerSummary={handleTriggerSummary}
                summaryRequestedIds={summaryRequestedIds}
                summaryCompletedIds={summaryCompletedIds}
                isAiSummary={isAiSummary}
                hasSummaryContent={hasSummaryContent}
                showTagCloud={isRecent && !isSearchActive}
                onTagClick={handleTagClick}
              />
            ))}
          </InfiniteScroll>
        )}
        {isLoading && hasMore && <div className="loading-overlay">로딩 중...</div>}
        {isFavoritesPage && !favoriteReports && !isLoading && <div className="loading-overlay">즐겨찾기 불러오는 중...</div>}
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

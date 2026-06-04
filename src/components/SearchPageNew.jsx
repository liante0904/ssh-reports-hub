import React, { useState, useEffect, useCallback, useMemo } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import CompanySelect from './CompanySelect';
import BoardSelect from './BoardSelect';
import ShareMenu from './ShareMenu';
import ReportGroup from './report/ReportGroup';
import { useReport } from '../context/useReport';
import { useReportFetch } from '../hooks/useReportFetch';
import { CONFIG } from '../constants/config';
import { request } from '../utils/api';
import { buildShareMenuData } from '../utils/shareMenuData';
import './SearchPageNew.css';

function SearchPageNew() {
  const { telegramUser } = useReport();
  const isAdmin = telegramUser?.is_admin === true;

  // 로컬 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState('title');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('recent');
  const [selectedSort, setSelectedSort] = useState('time');

  // 텍스트 디바운스
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // 증권사 선택 시 게시판 fetch
  useEffect(() => {
    if (!selectedCompany) {
      setBoards([]);
      setSelectedBoard('');
      return;
    }

    const controller = new AbortController();
    const fetchBoards = async () => {
      try {
        const data = await request(`${CONFIG.API.BOARDS_URL}?company=${selectedCompany}`, {
          signal: controller.signal
        });
        setBoards(Array.isArray(data) ? data.filter(b => b.report_count > 0) : []);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to fetch boards:', error);
          setBoards([]);
        }
      }
    };

    fetchBoards();
    return () => controller.abort();
  }, [selectedCompany]);

  // 검색 쿼리 빌드
  const searchQuery = useMemo(() => {
    const trimmed = debouncedQuery.trim();
    const isCompanyOnly = !trimmed && selectedCompany;
    return {
      query: isCompanyOnly ? selectedCompany : trimmed,
      category: isCompanyOnly ? 'company' : (trimmed ? category : ''),
      companyOrder: selectedCompany || null,
      board: selectedBoard ? Number(selectedBoard) : null,
    };
  }, [debouncedQuery, category, selectedCompany, selectedBoard]);

  // useReportFetch를 활용하여 실시간 검색 결과 fetch
  const fetchPathname = `/${selectedRoute}`;
  const {
    reports,
    isLoading,
    hasMore,
    offset,
    fetchReports
  } = useReportFetch(searchQuery, fetchPathname, null, selectedSort);

  // 리스트 컨트롤 상태 (즐겨찾기, 토글 등)
  const [dateToggles, setDateToggles] = useState({});
  const [firmToggles, setFirmToggles] = useState({});
  const [summaryToggles, setSummaryToggles] = useState({});
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('report_favorites');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [summaryRequestedIds, setSummaryRequestedIds] = useState(new Set());
  const [summaryCompletedIds, setSummaryCompletedIds] = useState(new Set());
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // 검색 조건 변경 시 날짜 토글 및 요약 초기화
  useEffect(() => {
    setDateToggles({});
    setFirmToggles({});
    setSummaryToggles({});
    setSummaryRequestedIds(new Set());
  }, [searchQuery, selectedRoute, selectedSort]);

  const toggleDate = useCallback((date) => {
    setDateToggles(prev => ({ ...prev, [date]: !prev[date] }));
  }, []);

  const toggleFirm = useCallback((date, firm) => {
    setFirmToggles(prev => ({
      ...prev,
      [date]: { ...prev[date], [firm]: !prev[date]?.[firm] }
    }));
  }, []);

  const toggleSummary = useCallback((id) => {
    setSummaryToggles(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleFavorite = useCallback((id) => {
    const baseUrl = CONFIG.API.BASE_URL;
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);

    setFavorites(prev => {
      const isAdding = !prev[id];
      const next = { ...prev, [id]: isAdding };
      localStorage.setItem('report_favorites', JSON.stringify(next));

      if (token && telegramUser) {
        const method = isAdding ? 'POST' : 'DELETE';
        request(`${baseUrl}/favorites/${id}`, {
          method,
          skipAuth: false,
        }).catch(() => {});
      }
      return next;
    });
  }, [telegramUser]);

  const handleOpenShareMenu = useCallback((e, report) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ 
      top: rect.bottom + window.scrollY, 
      left: rect.left + rect.width / 2 + window.scrollX
    });
    setSelectedReport(buildShareMenuData(report));
    setIsShareOpen(true);
  }, []);

  const handleTriggerSummary = useCallback(async (reportId) => {
    const baseUrl = CONFIG.API.BASE_URL;
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return;

    if (summaryRequestedIds.has(reportId)) return;
    setSummaryRequestedIds(prev => new Set(prev).add(reportId));

    try {
      const result = await request(`${baseUrl}/admin/reports/${reportId}/summarize`, {
        method: 'POST',
        skipAuth: false,
        timeout: 180000,
      });
      if (result?.status === 'success' || result?.status === 'skipped') {
        setSummaryCompletedIds(prev => new Set(prev).add(reportId));
      }
    } catch (error) {
      console.error('[Admin] ❌ 요약 실패:', error.message);
      setSummaryRequestedIds(prev => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
    }
  }, [summaryRequestedIds]);

  const handleReset = () => {
    setSearchTerm('');
    setCategory('title');
    setSelectedCompany('');
    setSelectedBoard('');
    setSelectedRoute('recent');
    setSelectedSort('time');
  };

  const handleCompanyChange = useCallback((e) => {
    setSelectedCompany(e.target.value);
    setSelectedBoard('');
  }, []);

  const handleLocalWriterClick = useCallback((writer) => {
    setCategory('writer');
    setSearchTerm(writer);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const isAiSummary = selectedRoute === 'ai-summary';
  const hasSummaryContent = (report) => {
    return report.gemini_summary && report.gemini_summary.trim() !== "" && report.gemini_summary.trim() !== " ";
  };

  const sortedDates = Object.keys(reports).sort((a, b) => b.localeCompare(a));
  const filteredSortedDates = isAiSummary
    ? sortedDates.filter(date => {
        const items = reports[date];
        if (Array.isArray(items)) {
          return items.some(hasSummaryContent);
        }
        return Object.values(items).some(firmReports =>
          firmReports.some(hasSummaryContent)
        );
      })
    : sortedDates;

  // 결과 개수 카운트
  const totalCount = useMemo(() => {
    let count = 0;
    Object.values(reports).forEach(items => {
      if (Array.isArray(items)) {
        count += items.length;
      } else {
        Object.values(items).forEach(firmList => {
          count += firmList.length;
        });
      }
    });
    return count;
  }, [reports]);

  return (
    <main className="search-page-new">
      <section className="search-page-header">
        <h1>통합 검색 및 필터</h1>
        <p>조건을 선택하는 즉시 실시간으로 최적화된 리포트를 분석합니다.</p>
      </section>

      {/* 프리미엄 필터 제어판 */}
      <section className="filter-panel-card">
        <fieldset className="filter-grid">
          
          <section className="filter-item text-search-box">
            <label className="filter-label">🔍 텍스트 검색</label>
            <div className="text-search-fields">
              <select
                className="search-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="title">제목</option>
                <option value="writer">작성자</option>
                <option value="tag">태그</option>
                <option value="sector">산업</option>
                <option value="stock">종목명</option>
              </select>
              <input
                type="text"
                placeholder="검색어 입력..."
                className="search-text-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-search-btn" onClick={() => setSearchTerm('')}>✕</button>
              )}
            </div>
          </section>

          <section className={`filter-item company-box ${selectedCompany ? 'has-boards' : ''}`}>
            <label className="filter-label">🗂️ 증권사 필터</label>
            <CompanySelect
              value={selectedCompany}
              onChange={handleCompanyChange}
              className="search-company-select"
            />
          </section>

          {selectedCompany && (
            <section className="filter-item board-box">
              <label className="filter-label">📋 게시판 필터</label>
              <BoardSelect
                value={selectedBoard}
                boards={boards}
                onChange={(e) => setSelectedBoard(e.target.value)}
                className="search-board-select"
              />
            </section>
          )}

          <section className="filter-item route-box">
            <label className="filter-label">🏷️ 조회 대상 분류</label>
            <div className="filter-chip-group">
              {[
                { id: 'recent', label: '최근 레포트', icon: '🕘' },
                { id: 'global', label: '글로벌 레포트', icon: '🌍' },
                { id: 'industry', label: '산업 레포트', icon: '🏭' },
                { id: 'outlook', label: '전망 레포트', icon: '🔮' },
                { id: 'ai-summary', label: 'AI요약 리포트', icon: '🤖' },
              ].map((route) => (
                <button
                  key={route.id}
                  type="button"
                  className={`filter-chip-item ${selectedRoute === route.id ? 'active' : ''}`}
                  onClick={() => setSelectedRoute(route.id)}
                >
                  <span className="chip-icon">{route.icon}</span>
                  <span className="chip-text">{route.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="filter-item sort-box">
            <label className="filter-label">⚖️ 정렬 기준</label>
            <div className="filter-chip-group">
              {[
                { id: 'time', label: '최근 등록일 순', icon: '⏱️' },
                { id: 'company', label: '증권사 가나다 순', icon: '🗂️' },
              ].map((sort) => (
                <button
                  key={sort.id}
                  type="button"
                  className={`filter-chip-item ${selectedSort === sort.id ? 'active' : ''}`}
                  onClick={() => setSelectedSort(sort.id)}
                >
                  <span className="chip-icon">{sort.icon}</span>
                  <span className="chip-text">{sort.label}</span>
                </button>
              ))}
            </div>
          </section>
        </fieldset>

        <div className="filter-actions-row">
          <button type="button" className="btn-filter-reset" onClick={handleReset}>
            🔄 필터 초기화
          </button>
        </div>
      </section>

      {/* 결과 리스트 영역 */}
      <section className="search-results-section">
        <header className="results-header">
          <h3>검색 결과 <span className="results-count">{totalCount}건</span></h3>
        </header>

        <div className="results-list-container">
          {offset === 0 && isLoading ? (
            <div className="search-state-msg">검색 조건에 맞춰 리포트를 분석 중입니다...</div>
          ) : filteredSortedDates.length === 0 && !isLoading ? (
            <div className="search-state-msg empty-msg">
              <span className="empty-icon">📂</span>
              <p>조건에 일치하는 리포트 데이터가 존재하지 않습니다.<br/>상단 필터 설정을 변경해 보세요.</p>
            </div>
          ) : (
            <InfiniteScroll
              dataLength={offset}
              next={fetchReports}
              hasMore={hasMore}
              scrollThreshold={0.7}
              loader={<div className="search-state-msg">더 불러오는 중...</div>}
            >
              {filteredSortedDates.map((date) => (
                <ReportGroup 
                  key={date}
                  date={date}
                  items={reports[date]}
                  isCollapsed={!!dateToggles[date]}
                  onToggleDate={toggleDate}
                  sortBy={selectedSort}
                  isFavoritesPage={false}
                  favorites={favorites}
                  collapsedFirms={firmToggles}
                  onToggleFirm={toggleFirm}
                  expandedSummaries={summaryToggles}
                  onToggleSummary={toggleSummary}
                  onToggleFavorite={toggleFavorite}
                  onOpenShareMenu={handleOpenShareMenu}
                  onWriterClick={handleLocalWriterClick}
                  showSortOptions={false}
                  setSortBy={setSelectedSort}
                  isAdmin={isAdmin}
                  onTriggerSummary={handleTriggerSummary}
                  summaryRequestedIds={summaryRequestedIds}
                  summaryCompletedIds={summaryCompletedIds}
                  isAiSummary={isAiSummary}
                  hasSummaryContent={hasSummaryContent}
                />
              ))}
            </InfiniteScroll>
          )}
        </div>
      </section>

      <ShareMenu 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        reportData={selectedReport}
        position={menuPosition}
      />
    </main>
  );
}

export default SearchPageNew;

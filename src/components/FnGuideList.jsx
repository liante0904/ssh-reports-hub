import React, { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../constants/config';
import { request } from '../utils/api';
import MenuSummary from './MenuSummary';
import './FnGuideList.css';

function FnGuideList() {
  const [summaries, setSummaries] = useState([]);
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});

  const LIMIT = 30;

  // 1. 날짜별 집계 목록 조회
  const fetchDates = useCallback(async () => {
    setIsLoadingDates(true);
    try {
      // 쿼리 매개변수 구성
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (providerFilter) params.append('provider', providerFilter);
      
      const url = `${CONFIG.API.BASE_URL}/api/fnguide/report-dates?${params.toString()}`;
      const data = await request(url, { skipAuth: false });
      setDates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch FnGuide report dates:', error);
      setDates([]);
    } finally {
      setIsLoadingDates(false);
    }
  }, [searchQuery, providerFilter]);

  // 2. 요약본 목록 조회
  const fetchSummaries = useCallback(async (isInitial = false) => {
    setIsLoading(true);
    const currentOffset = isInitial ? 0 : offset;
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (providerFilter) params.append('provider', providerFilter);
      if (selectedDate) params.append('report_date', selectedDate);
      params.append('limit', LIMIT.toString());
      params.append('offset', currentOffset.toString());

      const url = `${CONFIG.API.BASE_URL}/api/fnguide/report-summaries?${params.toString()}`;
      const data = await request(url, { skipAuth: false });
      
      if (Array.isArray(data)) {
        setSummaries(prev => isInitial ? data : [...prev, ...data]);
        setOffset(currentOffset + data.length);
        setHasMore(data.length === LIMIT);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch FnGuide summaries:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, providerFilter, selectedDate, offset]);

  // 검색어 입력 혹은 필터 변경 시 날짜 및 목록 초기화 후 재조회
  useEffect(() => {
    fetchDates();
    fetchSummaries(true);
  }, [selectedDate, providerFilter]);

  // 검색 수동 실행 (엔터키 또는 검색 버튼 클릭)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDates();
    fetchSummaries(true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchSummaries(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 날짜 선택 칩 토글
  const handleDateClick = (dateStr) => {
    if (selectedDate === dateStr) {
      setSelectedDate(''); // 해제
    } else {
      setSelectedDate(dateStr);
    }
  };

  return (
    <div className="fnguide-container">
      <div className="fnguide-header-panel">
        <MenuSummary
          menuName="FnGuide 종목요약 레포트"
          summaryItems={[
            { label: '전체', value: dates.length, icon: '📅' },
            ...(selectedDate ? [{ label: '선택일', value: selectedDate, icon: '📌' }] : []),
            ...(searchQuery ? [{ label: '검색', value: searchQuery, icon: '🔍' }] : []),
            ...(providerFilter ? [{ label: '증권사', value: providerFilter, icon: '🏢' }] : []),
          ]}
        />
        
        {/* 검색 폼 */}
        <form className="fnguide-search-form" onSubmit={handleSearchSubmit}>
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="회사명, 제목, 요약 내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="fnguide-search-input"
            />
            {searchQuery && (
              <button 
                type="button" 
                className="clear-search-btn"
                onClick={() => { setSearchQuery(''); }}
              >
                ✕
              </button>
            )}
          </div>
          
          <input
            type="text"
            placeholder="증권사 필터..."
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="fnguide-provider-input"
          />
          
          <button type="submit" className="fnguide-search-submit">
            검색
          </button>
        </form>

        {/* 날짜 필터 가로 칩 리스트 */}
        <div className="date-chips-scroll">
          {isLoadingDates && dates.length === 0 ? (
            <div className="chips-loading">날짜 로딩 중...</div>
          ) : (
            <>
              <button 
                onClick={() => setSelectedDate('')}
                className={`date-chip ${!selectedDate ? 'active' : ''}`}
              >
                전체
              </button>
              {dates.map((d) => (
                <button
                  key={d.report_date}
                  onClick={() => handleDateClick(d.report_date)}
                  className={`date-chip ${selectedDate === d.report_date ? 'active' : ''}`}
                >
                  📅 {d.report_date} <span className="chip-count">({d.report_count})</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* 요약본 목록 */}
      <div className="fnguide-list">
        {summaries.length === 0 && !isLoading ? (
          <div className="no-data-msg">
            💡 검색 조건에 부합하는 요약 레포트가 없습니다.
          </div>
        ) : (
          summaries.map((item) => {
            const isExpanded = expandedItems[item.summary_id];
            const textLimit = 300;
            const needsTruncate = item.summary_text && item.summary_text.length > textLimit;
            const displayText = isExpanded 
              ? item.summary_text 
              : (item.summary_text ? `${item.summary_text.slice(0, textLimit)}...` : '');

            return (
              <div className="fnguide-card" key={item.summary_id}>
                {/* 상단 메타 정보 */}
                <div className="card-top-meta">
                  <span className="card-date-badge">📅 {item.report_date}</span>
                  {item.provider && (
                    <span className="card-provider-badge">🏢 {item.provider}</span>
                  )}
                  {item.author && (
                    <span className="card-author-badge">✍️ {item.author}</span>
                  )}
                </div>

                {/* 회사명 및 종목코드 */}
                <div className="card-company-section">
                  <span className="card-company-name">{item.company_name}</span>
                  {item.company_code && (
                    <span className="card-company-code">{item.company_code}</span>
                  )}
                </div>

                {/* 리포트 제목 */}
                <h3 className="card-report-title">{item.report_title}</h3>

                {/* 요약 텍스트 */}
                {item.summary_text ? (
                  <div className="card-summary-text">
                    <p style={{ whiteSpace: 'pre-line' }}>{displayText}</p>
                    {needsTruncate && (
                      <button 
                        className="toggle-expand-btn"
                        onClick={() => toggleExpand(item.summary_id)}
                      >
                        {isExpanded ? '접기 ▲' : '더보기 ▼'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="card-summary-empty">요약 정보 본문이 없습니다.</div>
                )}

                {/* 하단 투자의견 및 가격정보 그리드 */}
                <div className="card-financial-grid">
                  <div className="grid-cell">
                    <span className="cell-label">투자의견</span>
                    <span className="cell-value opinion">{item.opinion || '-'}</span>
                  </div>
                  <div className="grid-cell">
                    <span className="cell-label">목표가</span>
                    <span className="cell-value target-price">
                      {item.target_price && item.target_price !== '0' 
                        ? `${item.target_price}` 
                        : '-'}
                    </span>
                  </div>
                  <div className="grid-cell">
                    <span className="cell-label">직전 종가</span>
                    <span className="cell-value prev-close">
                      {item.prev_close && item.prev_close !== '0' 
                        ? `${item.prev_close}` 
                        : '-'}
                    </span>
                  </div>
                </div>

                {/* PDF 다운로드 및 액션 영역 */}
                {(item.pdf_url || item.article_url) && (
                  <div className="card-actions">
                    <a 
                      href={item.pdf_url || item.article_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="pdf-action-btn"
                    >
                      <span>📕</span> 원본 PDF 보기
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 로딩 표시 */}
      {isLoading && (
        <div className="list-loading-spinner">
          <div className="spinner"></div> 요약 정보 가져오는 중...
        </div>
      )}

      {/* 더보기 버튼 */}
      {!isLoading && hasMore && summaries.length > 0 && (
        <button className="load-more-btn" onClick={handleLoadMore}>
          더보기
        </button>
      )}
    </div>
  );
}

export default FnGuideList;

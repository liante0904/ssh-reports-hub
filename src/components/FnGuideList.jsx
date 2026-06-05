import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CONFIG } from '../constants/config';
import { REPORT_SECTIONS } from '../constants/reportSections';
import { request } from '../utils/api';
import MenuSummary from './MenuSummary';
import './FnGuideList.css';

function FnGuideList({ embedded = false, initialSearchTerm = '' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSummaryId = searchParams.get('summary_id') || '';
  const queryParam = searchParams.get('q') || '';
  const [summaries, setSummaries] = useState([]);
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [searchQuery, setSearchQuery] = useState(queryParam || initialSearchTerm || '');
  const [providerFilter, setProviderFilter] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(() => Boolean(queryParam || initialSearchTerm));
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});
  const highlightedRef = useRef(null);

  const LIMIT = 30;

  useEffect(() => {
    const nextQuery = queryParam || initialSearchTerm || '';
    setSearchQuery(nextQuery);
    if (nextQuery) setIsFilterOpen(true);
  }, [queryParam, initialSearchTerm]);

  // 1. 날짜별 집계 목록 조회
  const fetchDates = useCallback(async (nextSearchQuery = searchQuery) => {
    setIsLoadingDates(true);
    try {
      // 쿼리 매개변수 구성
      const params = new URLSearchParams();
      if (nextSearchQuery) params.append('q', nextSearchQuery);
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
  const fetchSummaries = useCallback(async (isInitial = false, nextSearchQuery = searchQuery) => {
    setIsLoading(true);
    const currentOffset = isInitial ? 0 : offset;
    try {
      const params = new URLSearchParams();
      if (nextSearchQuery) params.append('q', nextSearchQuery);
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

  useEffect(() => {
    if (!embedded) return;
    const nextQuery = initialSearchTerm.trim();
    fetchDates(nextQuery);
    fetchSummaries(true, nextQuery);
  }, [embedded, initialSearchTerm]);

  useEffect(() => {
    if (!selectedSummaryId) return;
    setExpandedItems(prev => ({ ...prev, [selectedSummaryId]: true }));
  }, [selectedSummaryId]);

  useEffect(() => {
    if (!highlightedRef.current || !selectedSummaryId || isLoading) return;
    highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedSummaryId, summaries, isLoading]);

  // 검색 수동 실행 (엔터키 또는 검색 버튼 클릭)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!embedded) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (trimmed) next.set('q', trimmed);
        else next.delete('q');
        next.delete('summary_id');
        return next;
      });
    }
    fetchDates(trimmed);
    fetchSummaries(true, trimmed);
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

  const featuredSummary = useMemo(() => {
    if (!selectedSummaryId) return null;
    return summaries.find(item => String(item.summary_id) === String(selectedSummaryId)) || null;
  }, [selectedSummaryId, summaries]);

  const latestReportDate = dates[0]?.report_date || summaries[0]?.report_date || '';
  const companyTags = useMemo(() => {
    const tagMap = new Map();
    summaries
      .filter(item => !latestReportDate || item.report_date === latestReportDate)
      .forEach(item => {
        if (!item.company_name) return;
        const key = item.company_code || item.company_name;
        if (!tagMap.has(key)) {
          tagMap.set(key, {
            name: item.company_name,
            code: item.company_code,
            count: 0,
          });
        }
        tagMap.get(key).count += 1;
      });
    return Array.from(tagMap.values()).slice(0, 24);
  }, [summaries, latestReportDate]);

  const visibleSummaries = useMemo(() => {
    if (!featuredSummary) return summaries;
    return summaries.filter(item => String(item.summary_id) !== String(featuredSummary.summary_id));
  }, [summaries, featuredSummary]);

  const handleCompanyTagClick = (companyName) => {
    setSearchQuery(companyName);
    setIsFilterOpen(true);
    setSelectedDate('');
    if (!embedded) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('q', companyName);
        next.delete('summary_id');
        return next;
      });
    }
    fetchDates(companyName);
    fetchSummaries(true, companyName);
  };

  const renderSummaryCard = (item, { featured = false } = {}) => {
    const isExpanded = featured || expandedItems[item.summary_id] || expandedItems[String(item.summary_id)];
    const textLimit = featured ? 900 : 300;
    const needsTruncate = item.summary_text && item.summary_text.length > textLimit;
    const displayText = isExpanded
      ? item.summary_text
      : (item.summary_text ? `${item.summary_text.slice(0, textLimit)}...` : '');

    return (
      <div
        className={`fnguide-card ${featured ? 'featured' : ''}`}
        key={item.summary_id}
        ref={featured ? highlightedRef : null}
      >
        <div className="card-top-meta">
          <span className="card-date-badge">{item.report_date}</span>
          {item.provider && (
            <span className="card-provider-badge">{item.provider}</span>
          )}
          {item.author && (
            <span className="card-author-badge">{item.author}</span>
          )}
        </div>

        <div className="card-company-section">
          <button
            type="button"
            className="card-company-name"
            onClick={() => handleCompanyTagClick(item.company_name)}
          >
            {item.company_name}
          </button>
          {item.company_code && (
            <span className="card-company-code">{item.company_code}</span>
          )}
        </div>

        <h3 className="card-report-title">{item.report_title}</h3>

        {item.summary_text ? (
          <div className="card-summary-text">
            <p style={{ whiteSpace: 'pre-line' }}>{displayText}</p>
            {needsTruncate && (
              <button
                className="toggle-expand-btn"
                onClick={() => toggleExpand(item.summary_id)}
              >
                {isExpanded ? '접기' : '더보기'}
              </button>
            )}
          </div>
        ) : (
          <div className="card-summary-empty">요약 정보 본문이 없습니다.</div>
        )}

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

        {(item.pdf_url || item.article_url) && (
          <div className="card-actions">
            <a
              href={item.pdf_url || item.article_url}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-action-btn"
            >
              원본 PDF 보기
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`fnguide-container ${embedded ? 'embedded' : ''}`}>
      {companyTags.length > 0 && (
        <section className="fnguide-today-panel" aria-label="당일 발간 종목">
          <div className="fnguide-today-heading">
            <span>당일 발간 종목</span>
            {latestReportDate && <strong>{latestReportDate}</strong>}
          </div>
          <div className="fnguide-company-tags">
            {companyTags.map((tag) => (
              <button
                key={`${tag.code || tag.name}-${tag.count}`}
                type="button"
                className="fnguide-company-tag"
                onClick={() => handleCompanyTagClick(tag.name)}
                title={`${tag.name} 레포트 보기`}
              >
                <span>{tag.name}</span>
                {tag.count > 1 && <small>{tag.count}</small>}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="fnguide-header-panel">
        {!embedded && (
          <MenuSummary
            menuName={REPORT_SECTIONS.fnguide.title}
            description={REPORT_SECTIONS.fnguide.description}
            summaryItems={[
              { label: '일자', value: dates.length, icon: '' },
              ...(selectedDate ? [{ label: '선택일', value: selectedDate, icon: '' }] : []),
              ...(searchQuery ? [{ label: '검색', value: searchQuery, icon: '' }] : []),
              ...(providerFilter ? [{ label: '증권사', value: providerFilter, icon: '' }] : []),
            ]}
          />
        )}
        <div className="fnguide-filter-toggle-row">
          <button
            type="button"
            className="fnguide-filter-toggle"
            onClick={() => setIsFilterOpen(prev => !prev)}
          >
            종목필터 {isFilterOpen ? '접기' : '펼치기'}
          </button>
        </div>
        
        {/* 검색 폼 */}
        {isFilterOpen && <form className="fnguide-search-form" onSubmit={handleSearchSubmit}>
          <div className="search-input-wrapper">
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
        </form>}

        {/* 날짜 필터 가로 칩 리스트 */}
        {isFilterOpen && <div className="date-chips-scroll">
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
                  {d.report_date} <span className="chip-count">({d.report_count})</span>
                </button>
              ))}
            </>
          )}
        </div>}
      </div>

      {featuredSummary && (
        <section className="fnguide-featured-section">
          <div className="fnguide-section-label">꼭 봐야할 요약</div>
          {renderSummaryCard(featuredSummary, { featured: true })}
        </section>
      )}

      {/* 요약본 목록 */}
      <div className="fnguide-list">
        {visibleSummaries.length === 0 && !isLoading ? (
          <div className="no-data-msg">
            검색 조건에 부합하는 요약 레포트가 없습니다.
          </div>
        ) : (
          visibleSummaries.map((item) => renderSummaryCard(item))
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

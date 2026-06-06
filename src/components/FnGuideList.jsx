import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CONFIG } from '../constants/config';
import { REPORT_SECTIONS } from '../constants/reportSections';
import { request } from '../utils/api';
import { calculateUpsidePercent, formatUpsidePercent } from '../utils/financial';
import {
  buildFnGuideFacets,
  getFnGuideFacetScale,
  groupFnGuideSummaries,
  matchesFnGuideFacet,
  tokenizeFinancialHighlights,
} from '../utils/fnguide';
import MenuSummary from './MenuSummary';
import './FnGuideList.css';

function HighlightedSummary({ text }) {
  return tokenizeFinancialHighlights(text).map((token, index) => (
    token.highlighted
      ? (
          <strong
            className={token.kind === 'keyword' ? 'industry-keyword-highlight' : 'financial-highlight'}
            key={`${token.text}-${index}`}
          >
            {token.text}
          </strong>
        )
      : <React.Fragment key={`${index}-${token.text.slice(0, 12)}`}>{token.text}</React.Fragment>
  ));
}

function FnGuideList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSummaryId = searchParams.get('summary_id');
  const scrolledSummaryIdRef = useRef(null);
  const dateChipsRef = useRef(null);
  const [summaries, setSummaries] = useState([]);
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [facetType, setFacetType] = useState('company');
  const [selectedFacet, setSelectedFacet] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});
  const [collapsedCompanyGroups, setCollapsedCompanyGroups] = useState({});

  const LIMIT = 100;

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
      const nextDates = Array.isArray(data) ? data : [];
      setDates(nextDates);
      setSelectedDate((currentDate) => {
        if (currentDate === '') return currentDate;
        if (currentDate && nextDates.some((item) => item.report_date === currentDate)) {
          return currentDate;
        }
        return nextDates[0]?.report_date || '';
      });
    } catch (error) {
      console.error('Failed to fetch FnGuide report dates:', error);
      setDates([]);
    } finally {
      setIsLoadingDates(false);
    }
  }, [searchQuery, providerFilter]);

  // 2. 요약본 목록 조회
  const fetchSummaries = useCallback(async (isInitial = false) => {
    if (selectedDate === null) return;
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
    if (selectedDate !== null) fetchSummaries(true);
  }, [selectedDate, providerFilter]);

  // 검색 수동 실행 (엔터키 또는 검색 버튼 클릭)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSelectedFacet(null);
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

  const toggleCompanyGroup = (groupKey) => {
    setCollapsedCompanyGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // 날짜 선택 칩 토글
  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedFacet(null);
  };

  const scrollDateChips = (direction) => {
    const container = dateChipsRef.current;
    if (!container) return;
    container.scrollBy({
      left: direction * container.clientWidth * 0.75,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    if (selectedDate === null) return;
    const container = dateChipsRef.current;
    const selectedChip = container?.querySelector(`[data-date-chip="${selectedDate || 'all'}"]`);
    if (!container || !selectedChip) return;

    container.scrollTo({
      left: selectedChip.offsetLeft - container.offsetLeft,
      behavior: 'smooth',
    });
  }, [selectedDate, dates]);

  const facets = buildFnGuideFacets(summaries);
  const activeFacets = facets[facetType];
  const maxFacetCount = activeFacets[0]?.count || 0;
  const filteredSummaries = summaries.filter((item) => matchesFnGuideFacet(item, selectedFacet));
  const groupedSummaries = groupFnGuideSummaries(filteredSummaries);
  const visibleSummaries = groupedSummaries.flatMap((dateGroup) => [
    ...dateGroup.repeated.flatMap((companyGroup) => companyGroup.items),
    ...dateGroup.singles.flatMap((companyGroup) => companyGroup.items),
  ]);

  const handleFacetClick = (value) => {
    setSelectedFacet((current) => (
      current?.type === facetType && current.value === value
        ? null
        : { type: facetType, value }
    ));
  };

  const navigateToSummary = (summaryId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('summary_id', String(summaryId));
    setSearchParams(nextParams);
  };

  const renderSummaryCard = (item, { showCompany = true } = {}) => {
    const isSelected = String(item.summary_id) === selectedSummaryId;
    const isExpanded = expandedItems[item.summary_id];
    const selectedIndex = isSelected
      ? visibleSummaries.findIndex((summary) => String(summary.summary_id) === selectedSummaryId)
      : -1;
    const previousSummary = selectedIndex > 0 ? visibleSummaries[selectedIndex - 1] : null;
    const nextSummary = selectedIndex >= 0 && selectedIndex < visibleSummaries.length - 1
      ? visibleSummaries[selectedIndex + 1]
      : null;
    const upsidePercent = calculateUpsidePercent(item.target_price, item.prev_close);
    const hasTargetPrice = Boolean(item.target_price && item.target_price !== '0');
    const textLimit = 300;
    const needsTruncate = item.summary_text && item.summary_text.length > textLimit;
    const displayText = isExpanded
      ? item.summary_text
      : (item.summary_text ? `${item.summary_text.slice(0, textLimit)}${needsTruncate ? '...' : ''}` : '');

    return (
      <article
        id={`fnguide-summary-${item.summary_id}`}
        className={`fnguide-card ${isSelected ? 'selected-summary' : ''} ${isExpanded ? 'expanded-summary' : ''}`}
        key={item.summary_id}
      >
        {isSelected && <div className="selected-summary-label">선택한 레포트</div>}
        {isSelected && visibleSummaries.length > 1 && (
          <nav className="summary-sequence-nav" aria-label="선택한 레포트 이동">
            <button
              type="button"
              className="summary-sequence-btn"
              disabled={!previousSummary}
              onClick={() => previousSummary && navigateToSummary(previousSummary.summary_id)}
              aria-label={previousSummary ? `이전 레포트: ${previousSummary.company_name}` : '이전 레포트 없음'}
            >
              <span aria-hidden="true">←</span>
              <span>이전</span>
            </button>
            <span className="summary-sequence-position">
              {selectedIndex + 1} / {visibleSummaries.length}
            </span>
            <button
              type="button"
              className="summary-sequence-btn"
              disabled={!nextSummary}
              onClick={() => nextSummary && navigateToSummary(nextSummary.summary_id)}
              aria-label={nextSummary ? `다음 레포트: ${nextSummary.company_name}` : '다음 레포트 없음'}
            >
              <span>다음</span>
              <span aria-hidden="true">→</span>
            </button>
          </nav>
        )}
        <div className="card-top-meta">
          <span className="card-provider-badge">{item.provider || '증권사 미상'}</span>
          {item.author && <span className="card-author-badge">{item.author}</span>}
        </div>

        {showCompany && (
          <div className="card-company-section">
            <span className="card-company-name">{item.company_name}</span>
            {item.company_code && <span className="card-company-code">{item.company_code}</span>}
          </div>
        )}

        <h3 className="card-report-title">{item.report_title}</h3>

        {item.summary_text ? (
          <div className="card-summary-text">
            <p style={{ whiteSpace: 'pre-line' }}>
              <HighlightedSummary text={displayText} />
            </p>
            {needsTruncate && (
              <button
                type="button"
                className="toggle-expand-btn"
                onClick={() => toggleExpand(item.summary_id)}
                aria-expanded={Boolean(isExpanded)}
              >
                {isExpanded ? '접기 ▲' : '더보기 ▼'}
              </button>
            )}
          </div>
        ) : (
          <div className="card-summary-empty">요약 정보 본문이 없습니다.</div>
        )}

        <div className="card-financial-grid">
          <div className="grid-cell">
            <span className="cell-label">투자의견</span>
            <strong className="cell-value opinion">{item.opinion || '-'}</strong>
          </div>
          <div className="grid-cell">
            <span className="cell-label">목표가</span>
            <strong className="cell-value target-price">
              {hasTargetPrice ? item.target_price : '-'}
            </strong>
          </div>
          <div className="grid-cell">
            <span className="cell-label">직전 종가</span>
            <strong className="cell-value prev-close">
              {item.prev_close && item.prev_close !== '0' ? item.prev_close : '-'}
            </strong>
          </div>
          <div className="grid-cell">
            <span className="cell-label">상승여력</span>
            <strong className={`cell-value upside ${upsidePercent === null ? '' : upsidePercent >= 0 ? 'positive' : 'negative'}`}>
              {upsidePercent === null ? '-' : formatUpsidePercent(upsidePercent)}
            </strong>
          </div>
        </div>

        {hasTargetPrice && upsidePercent === null && (
          <p className="upside-data-note">직전 종가 데이터가 없어 상승여력을 계산하지 못했습니다.</p>
        )}

        {(item.pdf_url || item.article_url) && (
          <div className="card-actions">
            <a
              href={item.pdf_url || item.article_url}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-action-btn"
            >
              FnGuide 원문 보기
            </a>
          </div>
        )}
      </article>
    );
  };

  useEffect(() => {
    if (!selectedSummaryId || scrolledSummaryIdRef.current === selectedSummaryId) return;

    const selectedItem = summaries.find((item) => String(item.summary_id) === selectedSummaryId);
    if (!selectedItem) return;

    const groupKey = `${selectedItem.report_date}-${selectedItem.company_code || selectedItem.company_name || `summary-${selectedItem.summary_id}`}`;
    setCollapsedCompanyGroups((prev) => ({ ...prev, [groupKey]: false }));
    setExpandedItems((prev) => ({ ...prev, [selectedItem.summary_id]: true }));
    scrolledSummaryIdRef.current = selectedSummaryId;

    const timeoutId = window.setTimeout(() => {
      document
        .getElementById(`fnguide-summary-${selectedSummaryId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [selectedSummaryId, summaries]);

  return (
    <div className="fnguide-container">
      <div className="fnguide-header-panel">
        <MenuSummary
          menuName={REPORT_SECTIONS.fnguide.title}
          description={REPORT_SECTIONS.fnguide.description}
          summaryItems={[
            { label: '조회일', value: selectedDate || '전체', icon: '📅' },
            { label: '레포트', value: filteredSummaries.length, icon: '📄' },
            ...(searchQuery ? [{ label: '검색', value: searchQuery, icon: '🔍' }] : []),
            ...(providerFilter ? [{ label: '증권사', value: providerFilter, icon: '🏢' }] : []),
          ]}
        />
        
        {/* 전체 조회에서만 자유 검색을 노출한다. */}
        {!selectedDate && (
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
              onChange={(e) => {
                setProviderFilter(e.target.value);
                setSelectedFacet(null);
              }}
              className="fnguide-provider-input"
            />

            <button type="submit" className="fnguide-search-submit">
              검색
            </button>
          </form>
        )}

        {/* 날짜 필터 가로 칩 리스트 */}
        <div className="date-chips-control">
          <button
            type="button"
            className="date-scroll-btn previous"
            onClick={() => scrollDateChips(-1)}
            aria-label="이전 날짜 보기"
          >
            ‹
          </button>
          <div className="date-chips-scroll" ref={dateChipsRef}>
            {isLoadingDates && dates.length === 0 ? (
              <div className="chips-loading">날짜 로딩 중...</div>
            ) : (
              <>
                <button
                  type="button"
                  data-date-chip="all"
                  onClick={() => handleDateClick('')}
                  className={`date-chip ${!selectedDate ? 'active' : ''}`}
                >
                  전체
                </button>
                {dates.map((d) => (
                  <button
                    key={d.report_date}
                    type="button"
                    data-date-chip={d.report_date}
                    onClick={() => handleDateClick(d.report_date)}
                    className={`date-chip ${selectedDate === d.report_date ? 'active' : ''}`}
                  >
                    📅 {d.report_date} <span className="chip-count">({d.report_count})</span>
                  </button>
                ))}
              </>
            )}
          </div>
          <button
            type="button"
            className="date-scroll-btn next"
            onClick={() => scrollDateChips(1)}
            aria-label="다음 날짜 보기"
          >
            ›
          </button>
        </div>

        {summaries.length > 0 && (
          <section className="fnguide-facet-panel" aria-label="현재 일자 레포트 필터">
            <div className="fnguide-facet-header">
              <div className="fnguide-facet-tabs" role="tablist" aria-label="태그 분류">
                {[
                  ['company', '종목'],
                  ['provider', '증권사'],
                  ['author', '작성자'],
                ].map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    role="tab"
                    aria-selected={facetType === type}
                    className={`fnguide-facet-tab ${facetType === type ? 'active' : ''}`}
                    onClick={() => {
                      setFacetType(type);
                      setSelectedFacet(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {selectedFacet && (
                <button
                  type="button"
                  className="fnguide-facet-reset"
                  onClick={() => setSelectedFacet(null)}
                >
                  필터 해제
                </button>
              )}
            </div>
            <div className="fnguide-facet-cloud">
              {activeFacets.map((facet) => {
                const isActive = selectedFacet?.type === facetType && selectedFacet.value === facet.label;
                return (
                  <button
                    key={facet.label}
                    type="button"
                    className={`fnguide-facet-tag ${isActive ? 'active' : ''}`}
                    style={{ '--facet-scale': getFnGuideFacetScale(facet.count, maxFacetCount) }}
                    onClick={() => handleFacetClick(facet.label)}
                  >
                    <span>{facet.label}</span>
                    <small>{facet.count}</small>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* 요약본 목록 */}
      <div className="fnguide-list">
        {filteredSummaries.length === 0 && !isLoading ? (
          <div className="no-data-msg">
            검색 조건에 부합하는 요약 레포트가 없습니다.
          </div>
        ) : (
          groupedSummaries.map((dateGroup) => (
            <section className="fnguide-date-section" key={dateGroup.date}>
              <div className="fnguide-date-heading">
                <h2>{dateGroup.date}</h2>
                <span>{dateGroup.reportCount}건</span>
              </div>

              {dateGroup.repeated.length > 0 && (
                <div className="fnguide-repeated-area">
                  <div className="fnguide-repeated-title">집중 발간 종목</div>
                  {dateGroup.repeated.map((companyGroup) => {
                    const groupKey = `${dateGroup.date}-${companyGroup.key}`;
                    const isCollapsed = collapsedCompanyGroups[groupKey];
                    const providers = [...new Set(companyGroup.items.map((item) => item.provider).filter(Boolean))];

                    return (
                      <section className="fnguide-company-group" key={groupKey}>
                        <button
                          type="button"
                          className="fnguide-company-group-toggle"
                          onClick={() => toggleCompanyGroup(groupKey)}
                          aria-expanded={!isCollapsed}
                        >
                          <span className="company-group-main">
                            <strong>{companyGroup.companyName}</strong>
                            {companyGroup.companyCode && <small>{companyGroup.companyCode}</small>}
                          </span>
                          <span className="company-group-meta">
                            <span className="company-report-count">{companyGroup.items.length}건</span>
                            <small>{providers.join(' · ')}</small>
                            <span aria-hidden="true">{isCollapsed ? '＋' : '−'}</span>
                          </span>
                        </button>
                        {!isCollapsed && (
                          <div className="fnguide-company-reports">
                            {companyGroup.items.map((item) => renderSummaryCard(item, { showCompany: false }))}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}

              {dateGroup.singles.length > 0 && (
                <div className="fnguide-single-reports">
                  {dateGroup.singles.map((companyGroup) => renderSummaryCard(companyGroup.items[0]))}
                </div>
              )}
            </section>
          ))
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

import { useState, useCallback, useRef, useEffect } from 'react';
import { CONFIG } from '../constants/config';
import { request } from '../utils/api';
import { normalizeReportItem } from '../utils/reportNormalizer';

export function useReportFetch(searchQuery, pathname, sortBy) {
  const [reports, setReports] = useState({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
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

  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    
    const baseUrl = CONFIG.API.REPORT_FETCH;
    const tableName = CONFIG.API.TABLE_NAME;
    let apiUrl = `${baseUrl}/${tableName}`;

    if (pathname.includes('global')) {
      apiUrl += '/search/';
      params.append('mkt_tp', 'global');
    } else if (pathname.includes('industry')) {
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
  }, [offset, searchQuery, pathname, sortBy]);

  const mergeReports = useCallback((prev, newItems) => {
    const updated = { ...prev };

    for (const item of newItems) {
      const report = normalizeReportItem(item);
      const { date, firm } = report;

      // sortBy === 'time'일 때는 배열로 저장하여 서버 순차 정렬 유지
      // sortBy === 'company'일 때는 기존처럼 증권사별 객체로 저장 (리팩토링 대상이나 일단 호환성 유지)
      if (sortBy === 'time') {
        if (!updated[date] || !Array.isArray(updated[date])) updated[date] = [];
        const exists = updated[date].some((r) => r.id === report.id);
        if (!exists) updated[date].push(report);
      } else {
        if (!updated[date] || Array.isArray(updated[date])) updated[date] = {};
        if (!updated[date][firm]) updated[date][firm] = [];
        const exists = updated[date][firm].some((r) => r.id === report.id);
        if (!exists) updated[date][firm].push(report);
      }
    }

    return updated;
  }, [sortBy]);

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
      const data = await request(buildApiUrl(), { signal: controller.signal });
      if (data) {
        const { items, hasMore: apiHasMore } = data;
        setReports((prev) => mergeReports(isInitial ? {} : prev, items));
        setOffset((prev) => (isInitial ? items.length : prev + items.length));
        setHasMore(apiHasMore);
        hasMoreRef.current = apiHasMore;
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      // 다른 에러는 request에서 이미 처리됨
    } finally {
      if (!isInitial || abortControllerRef.current === controller) {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, [buildApiUrl, mergeReports]);

  useEffect(() => {
    setReports({});
    setOffset(0);
    setHasMore(true);
    hasMoreRef.current = true;
  }, [searchQuery, pathname, sortBy]);

  useEffect(() => {
    if (offset === 0) {
      fetchReports(true);
    }
  }, [offset, fetchReports]);

  return {
    reports,
    isLoading,
    hasMore,
    offset,
    fetchReports
  };
}

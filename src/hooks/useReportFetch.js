import { useState, useCallback, useRef, useEffect } from 'react';
import { CONFIG } from '../constants/config';
import { request } from '../utils/api';
import { buildReportFetchUrl } from '../utils/reportFetch';
import { normalizeReportItem } from '../utils/reportNormalizer';

export function useReportFetch(searchQuery, pathname) {
  const [reports, setReports] = useState({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const abortControllerRef = useRef(null);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const buildApiUrl = useCallback(() => buildReportFetchUrl({
    pathname,
    offset,
    searchQuery,
    baseUrl: CONFIG.API.REPORT_API_URL,
  }), [offset, searchQuery, pathname]);

  const mergeReports = useCallback((prev, newItems) => {
    const updated = { ...prev };

    for (const item of newItems) {
      const report = normalizeReportItem(item);
      const { date } = report;

      if (!updated[date] || !Array.isArray(updated[date])) {
        updated[date] = Array.isArray(updated[date])
          ? updated[date]
          : Object.values(updated[date] || {}).flat();
      }

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
  }, [searchQuery, pathname]);

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

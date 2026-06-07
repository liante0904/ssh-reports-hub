import { useState, useCallback, useRef, useEffect } from 'react';
import { CONFIG } from '../constants/config';
import { request } from '../utils/api';
import { buildReportFetchUrl } from '../utils/reportFetch';
import { normalizeReportItem } from '../utils/reportNormalizer';

export function useReportFetch(searchQuery, pathname, outlookYear, sortBy) {
  const [reports, setReports] = useState({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const abortControllerRef = useRef(null);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  // searchQuery 객체의 주소값이 변경되어도 내용이 같으면 재실행을 방지하기 위해 프리미티브 값으로 분해
  const query = searchQuery?.query;
  const category = searchQuery?.category;
  const companyOrder = searchQuery?.companyOrder;
  const board = searchQuery?.board;

  const buildApiUrl = useCallback(() => buildReportFetchUrl({
    pathname,
    offset,
    sortBy,
    searchQuery: { query, category, companyOrder, board },
    outlookYear,
    baseUrl: CONFIG.API.REPORT_API_URL,
  }), [offset, pathname, outlookYear, sortBy, query, category, companyOrder, board]);

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
        const items = Array.isArray(data.items) ? data.items : [];
        const apiHasMore = Boolean(data.hasMore);
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
  }, [query, category, companyOrder, board, pathname, outlookYear, sortBy]);

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

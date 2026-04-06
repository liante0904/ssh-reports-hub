import { useState, useCallback, useRef, useEffect } from 'react';

export function useReportFetch(searchQuery, pathname) {
  const [reports, setReports] = useState({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const abortControllerRef = useRef(null);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const BASE_URL = import.meta.env.VITE_ORACLE_REST_API;
  const TABLE_NAME = import.meta.env.VITE_TABLE_NAME;

  // Sync refs with state
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    let apiUrl = `${BASE_URL}/${TABLE_NAME}`;

    if (pathname.includes('global')) {
      apiUrl += '/search/';
      params.append('mkt_tp', 'global');
    } else if (pathname.includes('industry')) {
      apiUrl += '/industry';
    } else {
      apiUrl += '/search/';
    }

    params.append('offset', offset);

    if (searchQuery.query && searchQuery.category) {
      params.append(searchQuery.category, searchQuery.query);
    }

    return `${apiUrl}?${params.toString()}`;
  }, [offset, searchQuery, pathname, BASE_URL, TABLE_NAME]);

  const mergeReports = useCallback((prev, newItems) => {
    const updated = { ...prev };

    for (const item of newItems) {
      let rawDate = item.reg_dt ? item.reg_dt.trim() : 'Unknown';
      let date = rawDate;
      
      if (rawDate.length === 8 && /^\d+$/.test(rawDate)) {
        date = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
      } else {
        const match = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) {
          date = match[1];
        } else {
          const altMatch = rawDate.match(/^(\d{4}[./]\d{2}[./]\d{2})/);
          if (altMatch) {
            date = altMatch[1].replace(/\./g, '-').replace(/\//g, '-');
          }
        }
      }
      
      const firm = item.firm_nm ? item.firm_nm.trim() : 'Unknown';
      const report = {
        id: item.report_id,
        title: item.article_title,
        writer: item.writer,
        link: item.telegram_url || item.download_url || item.attach_url,
        gemini_summary: item.gemini_summary,
        firm: firm
      };

      if (!updated[date]) {
        updated[date] = {};
      } else {
        updated[date] = { ...updated[date] };
      }

      if (!updated[date][firm]) {
        updated[date][firm] = [];
      } else {
        updated[date][firm] = [...updated[date][firm]];
      }

      const exists = updated[date][firm].some((r) => r.id === report.id);
      if (!exists) {
        updated[date][firm].push(report);
      }
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
      const res = await fetch(buildApiUrl(), { signal: controller.signal });
      if (!res.ok) throw new Error('API 요청 실패');

      const { items, hasMore: apiHasMore } = await res.json();

      setReports((prev) => mergeReports(isInitial ? {} : prev, items));
      setOffset((prev) => (isInitial ? items.length : prev + items.length));
      
      setHasMore(apiHasMore);
      hasMoreRef.current = apiHasMore;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('❌ Error fetching reports:', err);
    } finally {
      // Only set isLoading(false) if this is still the active controller
      if (!isInitial || abortControllerRef.current === controller) {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, [buildApiUrl, mergeReports]);

  // Reset logic when search or path changes
  useEffect(() => {
    // Abort any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setReports({});
    setOffset(0);
    setHasMore(true);
    hasMoreRef.current = true;
    setIsLoading(false);
    isLoadingRef.current = false;
  }, [searchQuery, pathname]);

  // Initial fetch when offset is 0
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

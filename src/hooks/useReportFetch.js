import { useState, useCallback, useRef, useEffect } from 'react';

export function useReportFetch(searchQuery, pathname, sortBy) {
  const [reports, setReports] = useState({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const abortControllerRef = useRef(null);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ssh-oci.duckdns.org';

  // Sync refs with state
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    const apiUrl = `${BASE_URL.replace(/\/$/, '')}/reports/`;

    if (pathname.includes('global')) {
      params.append('mkt_tp', 'global');
    } else if (pathname.includes('industry')) {
      params.append('mkt_tp', 'industry');
    }

    params.append('offset', offset.toString());
    params.append('limit', '20');

    if (sortBy === 'company') {
      params.append('sort', 'company');
    }

    if (searchQuery.query) {
      params.append('q', searchQuery.query);
    }

    return `${apiUrl}?${params.toString()}`;
  }, [offset, searchQuery, pathname, BASE_URL, sortBy]);

  const mergeReports = useCallback((prev, newItems) => {
    const updated = { ...prev };

    if (!Array.isArray(newItems)) {
      console.warn('❌ newItems is not an array:', newItems);
      return updated;
    }

    for (const item of newItems) {
      // API 응답 필드 (소문자/대문자 혼용 대응)
      const report_id = item.report_id || item.REPORT_ID;
      const firm_nm = item.FIRM_NM || item.firm_nm || 'Unknown';
      const reg_dt = item.REG_DT || item.reg_dt || 'Unknown';
      const article_title = item.ARTICLE_TITLE || item.article_title;
      const writer = item.WRITER || item.writer;
      const telegram_url = item.TELEGRAM_URL || item.telegram_url;
      const pdf_url = item.PDF_URL || item.pdf_url;
      const attach_url = item.ATTACH_URL || item.attach_url;
      const gemini_summary = item.GEMINI_SUMMARY || item.gemini_summary;

      if (!report_id) continue;

      let date = reg_dt.toString().trim();
      if (date.length === 8 && /^\d+$/.test(date)) {
        date = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
      } else {
        const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) date = match[1];
      }
      
      const firm = firm_nm.trim();
      const report = {
        id: report_id,
        title: article_title,
        writer: writer,
        link: telegram_url || pdf_url || attach_url,
        gemini_summary: gemini_summary,
        firm: firm 
      };

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
      const apiUrl = buildApiUrl();
      const res = await fetch(apiUrl, { signal: controller.signal });
      if (!res.ok) throw new Error(`API 요청 실패: ${res.status}`);

      const data = await res.json();
      
      // FastAPI는 보통 배열을 직접 반환하거나 { items: [] } 형태
      const items = Array.isArray(data) ? data : (data.items || []);
      
      // hasMore 판단: 배열 길이가 0이면 더 이상 없음
      const apiHasMore = items.length > 0;

      setReports((prev) => mergeReports(isInitial ? {} : prev, items));
      setOffset((prev) => (isInitial ? items.length : prev + items.length));
      
      setHasMore(apiHasMore);
      hasMoreRef.current = apiHasMore;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('❌ Error fetching reports:', err);
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

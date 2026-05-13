import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getProxyPdfUrl } from '../../utils/reportLinks';
import './PDFViewerModal.css';

const PDFViewerModal = ({ report, onClose }) => {
  const historyPushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 리포트 변경 시 로딩 상태 리셋
  useEffect(() => {
    if (report) setIsLoading(true);
  }, [report]);

  // 모달 오픈 시 바디 스크롤 방지
  useEffect(() => {
    if (!report) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [report]);

  useEffect(() => {
    if (!report) return;

    const setViewerHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--pdf-viewer-height', `${height}px`);
    };

    setViewerHeight();
    window.visualViewport?.addEventListener('resize', setViewerHeight);
    window.visualViewport?.addEventListener('scroll', setViewerHeight);
    window.addEventListener('resize', setViewerHeight);

    return () => {
      window.visualViewport?.removeEventListener('resize', setViewerHeight);
      window.visualViewport?.removeEventListener('scroll', setViewerHeight);
      window.removeEventListener('resize', setViewerHeight);
      document.documentElement.style.removeProperty('--pdf-viewer-height');
    };
  }, [report]);

  useEffect(() => {
    if (!report) return;

    const state = window.history.state || {};
    window.history.pushState({ ...state, pdfViewerOpen: true }, '', window.location.href);
    historyPushedRef.current = true;

    const handlePopState = () => {
      historyPushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (historyPushedRef.current && window.history.state?.pdfViewerOpen) {
        historyPushedRef.current = false;
        window.history.back();
      }
    };
  }, [report]);

  const { title = '' } = report || {};

  // 브라우저 내장 PDF 뷰어로 통일 (pdf.js 제거)
  // Chrome/Firefox/Safari/Edge 모두 네이티브 C++ 렌더링 → JS보다 빠름
  // getProxyPdfUrl 내부에서 DS/proxy 분기 처리
  const viewerUrl = useMemo(() => {
    if (!report) return '';
    return getProxyPdfUrl(report, window.location.origin);
  }, [report]);

  if (!report) return null;

  return (
    <div className="pdf-viewer-overlay" role="dialog" aria-modal="true">
      <div className="pdf-viewer-header">
        <div className="pdf-viewer-title">{title}</div>
        <button className="pdf-viewer-close" onClick={onClose} aria-label="뷰어 닫기" title="닫기">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.3-6.29z" />
          </svg>
        </button>
      </div>
      <div className="pdf-viewer-body">
        {isLoading && (
          <div className="pdf-viewer-spinner">
            <svg viewBox="0 0 24 24" width="48" height="48" className="spinner-icon">
              <circle cx="12" cy="12" r="10" fill="none" stroke="var(--primary-color, #007aff)" strokeWidth="2.5" strokeDasharray="31.4 31.4" strokeLinecap="round" />
            </svg>
            <span>PDF 불러오는 중...</span>
          </div>
        )}
        <iframe 
          src={viewerUrl} 
          className="pdf-viewer-iframe"
          title="PDF Viewer"
          allow="fullscreen"
          onLoad={() => setIsLoading(false)}
          style={{ opacity: isLoading ? 0 : 1 }}
        />
      </div>
    </div>
  );
};

export default PDFViewerModal;

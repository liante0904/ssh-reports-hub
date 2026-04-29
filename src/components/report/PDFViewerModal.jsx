import React, { useEffect, useMemo, useRef } from 'react';
import { getProxyPdfUrl, isDsReport } from '../../utils/reportLinks';
import './PDFViewerModal.css';

const PDFViewerModal = ({ report, onClose }) => {
  const historyPushedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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
  const userAgent = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/i.test(userAgent);
  const isMobile = /Android|iPad|iPhone|iPod/i.test(userAgent) || window.matchMedia('(max-width: 768px)').matches;

  // PDF 경로 결정
  const viewerUrl = useMemo(() => {
    if (!report) return '';

    const origin = window.location.origin;
    const proxyUrl = getProxyPdfUrl(report, origin);

    // DS는 pdf.js 초기화/사전 요청이 느려서 모든 환경에서 브라우저 PDF 뷰어만 사용
    if (isDsReport(report) || isIos || isMobile) {
      return proxyUrl;
    }

    // 그 외(안드로이드, PC)는 셀프 호스팅된 pdf.js로 통일하여 일관성 확보
    const viewerPath = `${origin}/lib/pdfjs/web/viewer.html`;
    const viewerParams = `file=${encodeURIComponent(proxyUrl)}`;
    const viewerHash = 'pagemode=none&zoom=page-width';
    
    return `${viewerPath}?${viewerParams}#${viewerHash}`;
  }, [isIos, isMobile, report]);

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
        <iframe 
          src={viewerUrl} 
          className="pdf-viewer-iframe"
          title="PDF Viewer"
          allow="fullscreen"
        />
      </div>
    </div>
  );
};

export default PDFViewerModal;

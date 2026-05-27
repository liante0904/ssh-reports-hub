import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProxyPdfUrl } from '../../utils/reportLinks';
import './PDFViewerModal.css';

const PDFViewerModal = ({ report, onClose }) => {
  const historyPushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const { title = '', firm = '', writer = '', shareUrl = '' } = report || {};

  // 브라우저 내장 PDF 뷰어로 통일 (pdf.js 제거)
  const viewerUrl = useMemo(() => {
    if (!report) return '';
    return getProxyPdfUrl(report, window.location.origin);
  }, [report]);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [shareUrl]);

  const handleKakaoShare = useCallback(() => {
    const shareText = `[${firm}] ${title}`;
    if (window.Kakao && window.Kakao.isInitialized()) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: shareText,
          description: writer ? `작성자: ${writer}` : '',
          imageUrl: 'https://ssh-oci.netlify.app/og-image.png',
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [{ title: '레포트 보기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
      });
    } else {
      window.open(`https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(shareUrl)}`, '_blank');
    }
  }, [firm, title, writer, shareUrl]);

  if (!report) return null;

  return (
    <div className="pdf-viewer-overlay" role="dialog" aria-modal="true">
      <div className="pdf-viewer-header">
        <div className="pdf-viewer-header-left">
          {firm && <span className="pdf-viewer-firm-badge">{firm}</span>}
          <div className="pdf-viewer-title">{title}</div>
        </div>
        <div className="pdf-viewer-header-actions">
          <button className="pdf-viewer-share-btn" onClick={handleKakaoShare} title="카카오톡 공유">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-3.36 0-6-2.64-6-6s2.64-6 6-6 6 2.64 6 6-2.64 6-6 6zm-2-6c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1zm4 0c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1z"/>
            </svg>
          </button>
          <button className="pdf-viewer-share-btn" onClick={handleCopyUrl} title="URL 복사">
            {copied ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#34c759">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            )}
          </button>
          <button className="pdf-viewer-close" onClick={onClose} aria-label="뷰어 닫기" title="닫기">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.3-6.29z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="pdf-viewer-body" style={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
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
          width="100%"
          onLoad={() => setIsLoading(false)}
          style={{ opacity: isLoading ? 0 : 1 }}
        />
      </div>
    </div>
  );
};

export default PDFViewerModal;

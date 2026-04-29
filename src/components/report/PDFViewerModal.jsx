import React, { useEffect } from 'react';
import './PDFViewerModal.css';

const PDFViewerModal = ({ report, onClose }) => {
  // 모달 오픈 시 바디 스크롤 방지
  useEffect(() => {
    if (!report) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [report]);

  if (!report) return null;

  const { title, link } = report;
  const userAgent = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/i.test(userAgent);

  // PDF 경로 결정
  const getViewerUrl = () => {
    const origin = window.location.origin;
    const fileName = encodeURIComponent(`[${report.firm}] ${title}.pdf`);
    
    // 1. 프록시 URL 생성
    const proxyUrl = `${origin}/.netlify/functions/proxy?url=${encodeURIComponent(link)}&filename=${fileName}`;

    // 2. iOS는 브라우저 내장 뷰어가 가장 빠르고 안정적임
    if (isIos) {
      return proxyUrl;
    }

    // 3. 그 외(안드로이드, PC)는 셀프 호스팅된 pdf.js로 통일하여 일관성 확보
    const viewerPath = `${origin}/lib/pdfjs/web/viewer.html`;
    const viewerParams = `file=${encodeURIComponent(proxyUrl)}`;
    const viewerHash = 'pagemode=none&zoom=page-width';
    
    return `${viewerPath}?${viewerParams}#${viewerHash}`;
  };

  const viewerUrl = getViewerUrl();

  return (
    <div className="pdf-viewer-overlay">
      <div className="pdf-viewer-header">
        <div className="pdf-viewer-title">{title}</div>
        <button className="pdf-viewer-close" onClick={onClose} aria-label="Close viewer">&times;</button>
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

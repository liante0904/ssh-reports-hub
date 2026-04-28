import React, { useEffect } from 'react';
import './PDFViewerModal.css';

const PDFViewerModal = ({ report, onClose }) => {
  if (!report) return null;

  const { title, link, id } = report;
  const userAgent = navigator.userAgent || '';
  const isAndroid = /Android/i.test(userAgent);
  const isIos = /iPad|iPhone|iPod/i.test(userAgent);

  // PDF 경로 결정
  const getViewerUrl = () => {
    const origin = window.location.origin;
    // DS/DB 등 특수한 경우는 무조건 proxy를 통해야 함
    const needsProxy = 
      report.firm?.includes('DS투자') || 
      report.firm?.includes('DB금융') || 
      report.firm?.includes('DB투자') ||
      link?.includes('dbsec.co.kr') ||
      link?.includes('db-fi.com');

    const fileName = encodeURIComponent(`[${report.firm}] ${title}.pdf`);
    // proxyUrl은 share.js 로직과 동일하게 구성
    const proxyUrl = `${origin}/.netlify/functions/proxy?url=${encodeURIComponent(link)}&filename=${fileName}`;

    if (isAndroid) {
      // 안드로이드는 셀프 호스팅된 pdf.js 사용
      return `${origin}/lib/pdfjs/web/viewer.html?file=${encodeURIComponent(proxyUrl)}`;
    } else if (isIos) {
      // iOS는 proxyUrl 직접 사용 (브라우저 내장 뷰어)
      return proxyUrl;
    } else {
      // PC는 proxyUrl을 iframe에 직접 넣어도 잘 나옴 (내장 엔진)
      return proxyUrl;
    }
  };

  const viewerUrl = getViewerUrl();

  // 모달 오픈 시 바디 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="pdf-viewer-overlay">
      <div className="pdf-viewer-header">
        <div className="pdf-viewer-title">{title}</div>
        <button className="pdf-viewer-close" onClick={onClose}>&times;</button>
      </div>
      <div className="pdf-viewer-body">
        <iframe 
          src={viewerUrl} 
          className="pdf-viewer-iframe"
          title="PDF Viewer"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default PDFViewerModal;

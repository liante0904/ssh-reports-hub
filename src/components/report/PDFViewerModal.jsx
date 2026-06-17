import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProxyPdfUrl } from '../../utils/reportLinks';
import { usePdfDocument } from '../../hooks/usePdfDocument';
import { createRenderQueue } from '../../utils/renderQueue';
import PdfPage from './PdfPage';
import './PDFViewerModal.css';

const PRELOAD_PAGES = 1;
const MAX_CACHED_PAGES = 6;
// iOS PWA: fit-width 강제 + pinch zoom 허용
const INITIAL_SCALE_FALLBACK = 1;

/** 컨테이너 width / 첫 페이지 viewport width → fit-width scale */
function calcFitScale(container, pageWidth) {
  if (!container || !pageWidth) return INITIAL_SCALE_FALLBACK;
  const cw = container.clientWidth;
  return cw > 0 && pageWidth > 0 ? cw / pageWidth : INITIAL_SCALE_FALLBACK;
}

const PDFViewerModal = ({ report, onClose }) => {
  const historyPushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const renderQueue = useRef(createRenderQueue());
  const renderedRef = useRef(new Set());
  const pageWidthRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [visiblePages, setVisiblePages] = useState(new Set([1]));
  const [scale, setScale] = useState(INITIAL_SCALE_FALLBACK);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { if (report) { setIsLoading(true); setNumPages(0); renderedRef.current = new Set(); setScale(INITIAL_SCALE_FALLBACK); } }, [report]);

  // body scroll lock
  useEffect(() => {
    if (!report) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [report]);

  // iOS PWA viewport height
  useEffect(() => {
    if (!report) return;
    const setH = () => document.documentElement.style.setProperty('--pdf-viewer-height', `${window.visualViewport?.height || window.innerHeight}px`);
    setH();
    window.visualViewport?.addEventListener('resize', setH);
    window.addEventListener('resize', setH);
    return () => { window.visualViewport?.removeEventListener('resize', setH); window.removeEventListener('resize', setH); document.documentElement.style.removeProperty('--pdf-viewer-height'); };
  }, [report]);

  // history back-button close
  useEffect(() => {
    if (!report) return;
    window.history.pushState({ ...window.history.state, pdfViewerOpen: true }, '', window.location.href);
    historyPushedRef.current = true;
    const h = () => { historyPushedRef.current = false; onCloseRef.current(); };
    window.addEventListener('popstate', h);
    return () => { window.removeEventListener('popstate', h); if (historyPushedRef.current && window.history.state?.pdfViewerOpen) { historyPushedRef.current = false; window.history.back(); } };
  }, [report]);

  const { title = '', firm = '', writer = '', shareUrl = '' } = report || {};

  const viewerUrl = useMemo(() => report ? getProxyPdfUrl(report, window.location.origin) : '', [report]);

  // proxy에서 PDF binary fetch → object URL
  const [pdfDataUrl, setPdfDataUrl] = useState('');
  useEffect(() => {
    if (!viewerUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(viewerUrl);
        if (!r.ok || cancelled) return;
        const blob = await r.blob();
        if (!cancelled) setPdfDataUrl(URL.createObjectURL(blob));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [viewerUrl]);

  const { pdf } = usePdfDocument(pdfDataUrl);

  // PDF 로드 → 첫 페이지 viewport width 측정 → fit-width scale 계산
  useEffect(() => {
    if (!pdf) return;
    setNumPages(pdf.numPages);
    setIsLoading(false);

    let cancelled = false;
    pdf.getPage(1).then(page => {
      if (!cancelled) {
        pageWidthRef.current = page.getViewport({ scale: 1 }).width;
        const s = calcFitScale(containerRef.current, pageWidthRef.current);
        setScale(s);
        page.cleanup();
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [pdf]);

  // scale 변경 시 모든 렌더 초기화 → 새 scale로 다시 그림
  useEffect(() => {
    renderedRef.current = new Set();
  }, [scale]);

  // resize → scale 재계산 + 렌더 초기화
  useEffect(() => {
    const onResize = () => {
      const s = calcFitScale(containerRef.current, pageWidthRef.current);
      setScale(s);
    };
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); window.visualViewport?.removeEventListener('resize', onResize); };
  }, []);

  // IntersectionObserver: 보이는 페이지 감지
  useEffect(() => {
    if (!containerRef.current || numPages === 0) return;
    if (observerRef.current) observerRef.current.disconnect();
    const obs = new IntersectionObserver((entries) => {
      setVisiblePages(prev => {
        const next = new Set(prev);
        for (const e of entries) {
          const n = Number(e.target.dataset.page);
          e.isIntersecting ? next.add(n) : next.delete(n);
        }
        return next;
      });
    }, { root: containerRef.current, rootMargin: '200px 0px 200px 0px' });
    observerRef.current = obs;
    containerRef.current.querySelectorAll('[data-page]').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [numPages]);

  // visible ±1 페이지 렌더
  useEffect(() => {
    if (!pdf || numPages === 0) return;
    const targets = new Set();
    visiblePages.forEach(n => {
      for (let i = -PRELOAD_PAGES; i <= PRELOAD_PAGES; i++) {
        const pn = n + i;
        if (pn >= 1 && pn <= numPages && !renderedRef.current.has(pn)) targets.add(pn);
      }
    });

    targets.forEach(pageNum => {
      renderedRef.current.add(pageNum);
      renderQueue.current.enqueue(`p${pageNum}`, async () => {
        if (renderedRef.current.size > MAX_CACHED_PAGES) {
          const far = [...renderedRef.current]
            .filter(n => !visiblePages.has(n))
            .sort((a, b) => {
              const vis = [...visiblePages];
              const da = Math.min(...vis.map(v => Math.abs(v - a)));
              const db = Math.min(...vis.map(v => Math.abs(v - b)));
              return db - da;
            });
          far.slice(0, renderedRef.current.size - MAX_CACHED_PAGES).forEach(n => renderedRef.current.delete(n));
        }
      });
    });
  }, [pdf, numPages, visiblePages]);

  // cleanup
  useEffect(() => () => {
    renderQueue.current.cancelAll();
    if (observerRef.current) observerRef.current.disconnect();
    if (pdfDataUrl) URL.revokeObjectURL(pdfDataUrl);
  }, [pdfDataUrl]);

  const handleCopyUrl = useCallback(async () => { try { await navigator.clipboard.writeText(shareUrl || window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }, [shareUrl]);

  const handleKakaoShare = useCallback(() => {
    const st = `[${firm}] ${title}`;
    if (window.Kakao?.isInitialized()) {
      window.Kakao.Share.sendDefault({ objectType: 'feed', content: { title: st, description: writer ? `작성자: ${writer}` : '', imageUrl: 'https://ssh-oci.netlify.app/og-image.png', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }, buttons: [{ title: '레포트 보기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }] });
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
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-3.36 0-6-2.64-6-6s2.64-6 6-6 6 2.64 6 6-2.64 6-6 6zm-2-6c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1zm4 0c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1z"/></svg>
          </button>
          <button className="pdf-viewer-share-btn" onClick={handleCopyUrl} title="URL 복사">
            {copied ? <svg viewBox="0 0 24 24" width="18" height="18" fill="#34c759"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              : <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>}
          </button>
          <button className="pdf-viewer-close" onClick={onClose} aria-label="뷰어 닫기">
            <svg viewBox="0 0 24 24" width="24" height="24"><path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.3-6.29z"/></svg>
          </button>
        </div>
      </div>
      <div className="pdf-viewer-body" ref={containerRef}>
        {isLoading && (
          <div className="pdf-viewer-spinner">
            <svg viewBox="0 0 24 24" width="48" height="48" className="spinner-icon"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--primary-color, #007aff)" strokeWidth="2.5" strokeDasharray="31.4 31.4" strokeLinecap="round"/></svg>
            <span>PDF 불러오는 중...</span>
          </div>
        )}
        <div className="pdf-viewer-pages" style={{ visibility: isLoading ? 'hidden' : 'visible' }}>
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i + 1} data-page={i + 1} className="pdf-page-wrapper">
              {renderedRef.current.has(i + 1) ? (
                <PdfPage pdf={pdf} pageNum={i + 1} scale={scale} />
              ) : (
                <div className="pdf-page-skeleton" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PDFViewerModal;

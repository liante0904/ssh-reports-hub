import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProxyPdfUrl } from '../../utils/reportLinks';
import { usePdfDocument } from '../../hooks/usePdfDocument';
import { usePinchZoom } from '../../hooks/usePinchZoom';
import './PDFViewerModal.css';

const MAX_DPR = 2;
const MAX_CANVAS_W = 2048;

/**
 * 단일 페이지 렌더링. canvas ref 직접 관리.
 */
function PdfCanvas({ pdf, pageNum, scale }) {
  const canvasRef = useRef(null);
  const renderRef = useRef(null);
  const destroyedRef = useRef(false);

  useEffect(() => {
    destroyedRef.current = false;
    return () => { destroyedRef.current = true; if (renderRef.current) renderRef.current.cancel(); };
  }, [pageNum]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let cancelled = false;

    if (renderRef.current) renderRef.current.cancel();

    (async () => {
      try {
        const page = await pdf.getPage(pageNum);
        if (cancelled || destroyedRef.current) { page.cleanup(); return; }
        const vp = page.getViewport({ scale });
        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const pw = Math.min(Math.floor(vp.width * dpr), MAX_CANVAS_W);
        const ph = Math.floor(vp.height * (pw / (vp.width * dpr)) * dpr);
        canvas.width = pw;
        canvas.height = ph;
        canvas.style.width = `${vp.width}px`;
        canvas.style.height = `${vp.height}px`;
        renderRef.current = page.render({ canvasContext: ctx, viewport: vp.clone({ width: pw / dpr, height: ph / dpr }) });
        await renderRef.current.promise;
        page.cleanup();
      } catch (e) { if (!cancelled) console.warn('[PdfCanvas]', e); }
    })();

    return () => { cancelled = true; };
  }, [pdf, pageNum, scale]);

  return <canvas ref={canvasRef} className="pdf-page-canvas" />;
}

const PdfCanvasMemo = React.memo(PdfCanvas);

const PDFViewerModal = ({ report, onClose }) => {
  const histRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const bodyRef = useRef(null);
  const pageWRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(0);
  const [fitS, setFitS] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { if (!report) return; setLoading(true); setNumPages(0); setFitS(1); }, [report]);

  // body scroll lock
  useEffect(() => {
    if (!report) return;
    const p = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = p; };
  }, [report]);

  // iOS PWA height
  useEffect(() => {
    if (!report) return;
    const setH = () => document.documentElement.style.setProperty('--pdf-viewer-height', `${window.visualViewport?.height || window.innerHeight}px`);
    setH();
    window.visualViewport?.addEventListener('resize', setH);
    window.addEventListener('resize', setH);
    return () => { window.visualViewport?.removeEventListener('resize', setH); window.removeEventListener('resize', setH); document.documentElement.style.removeProperty('--pdf-viewer-height'); };
  }, [report]);

  // history back
  useEffect(() => {
    if (!report) return;
    window.history.pushState({ ...window.history.state, pdf: 1 }, '', window.location.href);
    histRef.current = true;
    const h = () => { histRef.current = false; onCloseRef.current(); };
    window.addEventListener('popstate', h);
    return () => { window.removeEventListener('popstate', h); if (histRef.current && window.history.state?.pdf) { histRef.current = false; window.history.back(); } };
  }, [report]);

  const { title = '', firm = '', writer = '', shareUrl = '' } = report || {};
  const proxyUrl = useMemo(() => report ? getProxyPdfUrl(report, window.location.origin) : '', [report]);

  // fetch PDF binary
  const [dataUrl, setDataUrl] = useState('');
  useEffect(() => {
    if (!proxyUrl) return;
    let ok = true;
    (async () => { try { const r = await fetch(proxyUrl); if (r.ok && ok) setDataUrl(URL.createObjectURL(await r.blob())); } catch {} })();
    return () => { ok = false; };
  }, [proxyUrl]);

  const { pdf } = usePdfDocument(dataUrl);

  // fit-width scale
  useEffect(() => {
    if (!pdf) return;
    setNumPages(pdf.numPages);
    setLoading(false);
    let ok = true;
    pdf.getPage(1).then(p => {
      if (!ok) return;
      const pw = p.getViewport({ scale: 1 }).width;
      pageWRef.current = pw;
      const c = bodyRef.current;
      setFitS(c && c.clientWidth > 0 ? c.clientWidth / pw : 1);
      p.cleanup();
    }).catch(() => {});
    return () => { ok = false; };
  }, [pdf]);

  // pinch zoom
  const { zoom, resetZoom } = usePinchZoom(bodyRef);
  const scale = fitS * zoom;

  // resize
  useEffect(() => {
    const onR = () => {
      if (!bodyRef.current || !pageWRef.current) return;
      const cw = bodyRef.current.clientWidth;
      if (cw > 0) setFitS(cw / pageWRef.current);
    };
    window.addEventListener('resize', onR);
    window.visualViewport?.addEventListener('resize', onR);
    return () => { window.removeEventListener('resize', onR); window.visualViewport?.removeEventListener('resize', onR); };
  }, []);

  // cleanup
  useEffect(() => () => { if (dataUrl) URL.revokeObjectURL(dataUrl); }, [dataUrl]);

  const copyUrl = useCallback(async () => { try { await navigator.clipboard.writeText(shareUrl || window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }, [shareUrl]);

  const kakaoShare = useCallback(() => {
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
          <button className="pdf-viewer-share-btn" onClick={kakaoShare} title="카카오톡 공유">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-3.36 0-6-2.64-6-6s2.64-6 6-6 6 2.64 6 6-2.64 6-6 6zm-2-6c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1zm4 0c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1z"/></svg>
          </button>
          <button className="pdf-viewer-share-btn" onClick={copyUrl} title="URL 복사">
            {copied ? <svg viewBox="0 0 24 24" width="18" height="18" fill="#34c759"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              : <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>}
          </button>
          <button className="pdf-viewer-close" onClick={onClose} aria-label="뷰어 닫기">
            <svg viewBox="0 0 24 24" width="24" height="24"><path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.3-6.29z"/></svg>
          </button>
        </div>
      </div>

      <div className="pdf-viewer-body" ref={bodyRef}>
        {zoom !== 1 && (
          <button className="pdf-zoom-reset" onClick={resetZoom}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
            <span>{Math.round(zoom * 100)}%</span>
          </button>
        )}
        {loading && (
          <div className="pdf-viewer-spinner">
            <svg viewBox="0 0 24 24" width="48" height="48" className="spinner-icon"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--primary-color, #007aff)" strokeWidth="2.5" strokeDasharray="31.4 31.4" strokeLinecap="round"/></svg>
            <span>PDF 불러오는 중...</span>
          </div>
        )}
        <div className="pdf-viewer-pages" style={{ visibility: loading ? 'hidden' : 'visible' }}>
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i + 1} className="pdf-page-wrapper">
              <PdfCanvasMemo pdf={pdf} pageNum={i + 1} scale={scale} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PDFViewerModal;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProxyPdfUrl } from '../../utils/reportLinks';
import './PDFViewerModal.css';

// ---------------------------------------------------------------------------
// pdf.js lazy loader
// ---------------------------------------------------------------------------
let _pdfjs = null;
async function getPdfjs() {
  if (_pdfjs) return _pdfjs;
  _pdfjs = await import(/* @vite-ignore */ '/lib/pdfjs/build/pdf.mjs');
  _pdfjs.GlobalWorkerOptions.workerSrc = '/lib/pdfjs/build/pdf.worker.mjs';
  return _pdfjs;
}

// ---------------------------------------------------------------------------
// PageCanvas: 단일 PDF 페이지 → canvas
// ---------------------------------------------------------------------------
const MAX_DPR = 2;

function PageCanvas({ page, scale }) {
  const ref = useRef(null);
  const renderRef = useRef(null);
  const destroyedRef = useRef(false);

  useEffect(() => {
    destroyedRef.current = false;
    return () => { destroyedRef.current = true; if (renderRef.current) renderRef.current.cancel(); };
  }, [page, scale]);

  useEffect(() => {
    if (!page || !ref.current) return;
    if (renderRef.current) renderRef.current.cancel();
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let cancelled = false;

    (async () => {
      const vp = page.getViewport({ scale });
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const pw = Math.min(Math.floor(vp.width * dpr), 2400);
      const ph = Math.floor(vp.height * (pw / (vp.width * dpr)) * dpr);
      canvas.width = pw;
      canvas.height = ph;
      canvas.style.width = `${vp.width}px`;
      canvas.style.height = `${vp.height}px`;
      if (cancelled || destroyedRef.current) return;
      renderRef.current = page.render({ canvasContext: ctx, viewport: vp });
      await renderRef.current.promise;
    })().catch(() => {});

    return () => { cancelled = true; };
  }, [page, scale]);

  return <canvas ref={ref} className="pdf-page-canvas" />;
}

const PageCanvasMemo = React.memo(PageCanvas);

// ---------------------------------------------------------------------------
// PDFViewerModal
// ---------------------------------------------------------------------------
const PDFViewerModal = ({ report, onClose }) => {
  const histRef = useRef(false);
  const bodyRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pages, setPages] = useState([]);       // {pageNum, page}[]
  const [scale, setScale] = useState(1);
  const pwRef = useRef(null);                     // page 1 viewport width at scale=1
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // reset
  useEffect(() => {
    if (!report) return;
    setLoading(true);
    setPages([]);
    setScale(1);
    pwRef.current = null;
  }, [report]);

  // body lock + viewport pinch-zoom toggle
  useEffect(() => {
    if (!report) return;
    const vp = document.querySelector('meta[name="viewport"]');
    const prevVP = vp?.getAttribute('content') || '';
    const prevO = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=10.0, user-scalable=yes, viewport-fit=cover');
    return () => {
      document.body.style.overflow = prevO;
      if (vp) vp.setAttribute('content', prevVP);
    };
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

  // fetch → blob → pdf.js → 모든 페이지 로드 → fit-width scale → 끝
  useEffect(() => {
    if (!proxyUrl) return;
    let ok = true;

    (async () => {
      try {
        // 1. fetch blob
        const r = await fetch(proxyUrl);
        if (!r.ok || !ok) return;
        const blob = await r.blob();
        if (!ok) return;

        // 2. pdf.js
        const pdfjs = await getPdfjs();
        const url = URL.createObjectURL(blob);
        const doc = await pdfjs.getDocument({ url, cMapUrl: '/lib/pdfjs/web/cmaps/', cMapPacked: true }).promise;
        if (!ok) { doc.destroy(); URL.revokeObjectURL(url); return; }

        // 3. 모든 페이지 객체 미리 로드
        const pageList = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const pg = await doc.getPage(i);
          pageList.push({ pageNum: i, page: pg });
        }

        // 4. fit-width scale 계산
        const pw = pageList[0].page.getViewport({ scale: 1 }).width;
        pwRef.current = pw;
        const cw = bodyRef.current?.clientWidth || window.innerWidth;
        const s = cw > 0 && pw > 0 ? cw / pw : 1;

        if (!ok) { doc.destroy(); URL.revokeObjectURL(url); return; }
        setPages(pageList);
        setScale(s);
        setLoading(false);
      } catch (e) { console.warn('[PDFViewer]', e); if (ok) setLoading(false); }
    })();

    return () => { ok = false; };
  }, [proxyUrl]);

  // pinch zoom (user-scalable=no 환경에서도 동작)
  const zoomRef = useRef(1);
  const pinchRef = useRef({ dist: 0, base: 1 });
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const dist = (t) => { const dx = t[0].clientX - t[1].clientX; const dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy); };
    const onStart = (e) => { if (e.touches.length === 2) { pinchRef.current = { dist: dist(e.touches), base: zoomRef.current }; } };
    const onMove = (e) => {
      if (e.touches.length !== 2 || !pinchRef.current.dist) return;
      const z = Math.max(0.5, Math.min(5, pinchRef.current.base * (dist(e.touches) / pinchRef.current.dist)));
      zoomRef.current = z;
      setScale((pwRef.current && bodyRef.current) ? (bodyRef.current.clientWidth / pwRef.current) * z : z);
    };
    const onEnd = () => { pinchRef.current = { dist: 0, base: 1 }; };
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchmove', onMove); el.removeEventListener('touchend', onEnd); el.removeEventListener('touchcancel', onEnd); };
  }, []);

  // resize → scale 재계산
  useEffect(() => {
    const onR = () => {
      if (!bodyRef.current || !pwRef.current) return;
      const cw = bodyRef.current.clientWidth;
      if (cw > 0) setScale(cw / pwRef.current);
    };
    window.addEventListener('resize', onR);
    window.visualViewport?.addEventListener('resize', onR);
    return () => { window.removeEventListener('resize', onR); window.visualViewport?.removeEventListener('resize', onR); };
  }, []);

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
        {loading && (
          <div className="pdf-viewer-spinner">
            <svg viewBox="0 0 24 24" width="48" height="48" className="spinner-icon"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--primary-color, #007aff)" strokeWidth="2.5" strokeDasharray="31.4 31.4" strokeLinecap="round"/></svg>
            <span>PDF 불러오는 중...</span>
          </div>
        )}
        <div className="pdf-viewer-pages" style={{ visibility: loading ? 'hidden' : 'visible' }}>
          {pages.map(({ pageNum, page }) => (
            <div key={pageNum} className="pdf-page-wrapper">
              <PageCanvasMemo page={page} scale={scale} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PDFViewerModal;

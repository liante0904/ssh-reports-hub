import React, { useRef, useEffect, useState } from 'react';

/** iOS PWA: devicePixelRatio 최대 제한 (메모리 과다 방지) */
const MAX_DPR = 2;
const MAX_CANVAS_W = 2048;

const PdfPage = React.memo(({ pdf, pageNum, scale, onRenderDone }) => {
  const canvasRef = useRef(null);
  const renderRef = useRef(null);
  const [viewHeight, setViewHeight] = useState(0);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let cancelled = false;

    (async () => {
      try {
        const page = await pdf.getPage(pageNum);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        setViewHeight(viewport.height);

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const pw = Math.min(Math.floor(viewport.width * dpr), MAX_CANVAS_W);
        const ph = Math.floor(viewport.height * (pw / (viewport.width * dpr)) * dpr);

        canvas.width = pw;
        canvas.height = ph;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        renderRef.current = page.render({
          canvasContext: ctx,
          viewport: viewport.clone({ width: pw / dpr, height: ph / dpr }),
        });
        await renderRef.current.promise;
        if (!cancelled) onRenderDone?.();
        page.cleanup();
      } catch (e) {
        if (!cancelled) console.warn('[PdfPage] render error p' + pageNum, e);
      }
    })();

    return () => {
      cancelled = true;
      if (renderRef.current) renderRef.current.cancel();
    };
  }, [pdf, pageNum, scale]);

  // scale 변경 시 viewport 높이 업데이트 (비동기지만 대략적)
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    pdf.getPage(pageNum).then(page => {
      if (!cancelled) setViewHeight(page.getViewport({ scale }).height);
      page.cleanup();
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [pdf, pageNum, scale]);

  return (
    <div className="pdf-page-canvas-wrap" style={{ minHeight: viewHeight > 0 ? `${viewHeight}px` : 'auto' }}>
      <canvas ref={canvasRef} className="pdf-page-canvas" />
    </div>
  );
});

PdfPage.displayName = 'PdfPage';
export default PdfPage;

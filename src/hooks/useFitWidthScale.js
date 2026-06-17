import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 컨테이너 너비 / 첫 페이지 viewport width 기준 fit-width scale
 * visualViewport/orientation 변화 시 재계산
 */
export function useFitWidthScale(containerRef, pdf) {
  const [scale, setScale] = useState(1);
  const [pageWidth, setPageWidth] = useState(null);
  const rafRef = useRef(null);

  // 첫 페이지 viewport width 측정
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    pdf.getPage(1).then(page => {
      if (!cancelled) {
        setPageWidth(page.getViewport({ scale: 1 }).width);
        page.cleanup();
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [pdf]);

  const recalc = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const container = containerRef?.current;
      if (!container || !pageWidth) return;
      const cw = container.clientWidth;
      if (cw > 0 && pageWidth > 0) {
        setScale(cw / pageWidth);
      }
    });
  }, [containerRef, pageWidth]);

  useEffect(() => { recalc(); }, [recalc]);

  useEffect(() => {
    const onResize = () => recalc();
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [recalc]);

  return scale;
}

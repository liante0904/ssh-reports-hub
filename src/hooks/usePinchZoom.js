import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * iOS PWA: user-scalable=no 무력화 - JavaScript pinch zoom
 * 두 손가락 거리 변화 → scale 계산 → setState
 */
export function usePinchZoom(containerRef) {
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const initialDistRef = useRef(0);
  const initialZoomRef = useRef(1);
  const tickingRef = useRef(false);

  const getDist = useCallback((touches) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;

    const onStart = (e) => {
      if (e.touches.length === 2) {
        initialDistRef.current = getDist(e.touches);
        initialZoomRef.current = zoomRef.current;
      }
    };

    const onMove = (e) => {
      if (e.touches.length !== 2 || !initialDistRef.current) return;
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        const dist = getDist(e.touches);
        const scale = initialZoomRef.current * (dist / initialDistRef.current);
        setZoom(Math.max(0.5, Math.min(5, scale)));
        tickingRef.current = false;
      });
    };

    const onEnd = () => { initialDistRef.current = 0; };

    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [containerRef, getDist]);

  const resetZoom = useCallback(() => setZoom(1), []);

  return { zoom, resetZoom };
}

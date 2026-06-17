import { useState, useEffect, useRef } from 'react';

const PDFJS_PATH = '/lib/pdfjs/build/pdf.mjs';
let pdfjsLib = null;

async function ensurePdfjs() {
  if (pdfjsLib) return pdfjsLib;
  const mod = await import(/* @vite-ignore */ PDFJS_PATH);
  pdfjsLib = mod;
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/lib/pdfjs/build/pdf.worker.mjs';
  }
  return pdfjsLib;
}

/**
 * pdf.js 로딩 + PDFDocument 생성 훅
 */
export function usePdfDocument(url) {
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(url);

  useEffect(() => {
    if (!url) return;
    loadingRef.current = url;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const lib = await ensurePdfjs();
        if (cancelled || loadingRef.current !== url) return;
        const doc = await lib.getDocument({ url, cMapUrl: '/lib/pdfjs/web/cmaps/', cMapPacked: true }).promise;
        if (cancelled || loadingRef.current !== url) {
          doc.destroy();
          return;
        }
        setPdf(doc);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  // cleanup
  useEffect(() => {
    return () => {
      if (pdf) pdf.destroy();
    };
  }, [pdf]);

  return { pdf, loading, error };
}

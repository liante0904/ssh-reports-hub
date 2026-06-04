import { useState, useEffect, useRef, useCallback } from 'react';
import { useReport } from '../context/useReport';

export function useAppLayout() {
  const { isMenuOpen, setIsMenuOpen, isTopMenuOpen, setIsTopMenuOpen } = useReport();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isFloatingNavVisible, setIsFloatingNavVisible] = useState(true);
  const lastScrollY = useRef(window.scrollY);
  const rafId = useRef(null);
  const scrollDir = useRef(null);       // 'down' | 'up' | null
  const dirDistance = useRef(0);        // 같은 방향으로 누적된 거리
  const headerRef = useRef(null);

  // 메뉴 상태를 ref로 동기화 — scroll handler에서 stale closure 방지
  const isMenuOpenRef = useRef(isMenuOpen);
  const isTopMenuOpenRef = useRef(isTopMenuOpen);
  isMenuOpenRef.current = isMenuOpen;
  isTopMenuOpenRef.current = isTopMenuOpen;

  const toggleFloatingNav = useCallback(() => setIsFloatingNavVisible(p => !p), []);

  // 리사이즈 감지 (모바일/데스크톱 플로팅 바 제어)
  useEffect(() => {
    const handleResize = () => {
      setIsFloatingNavVisible(window.innerWidth >= 640);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 스크롤 감지 — 네비게이션 표시/숨김 + 메뉴 닫기
  useEffect(() => {
    const HIDE_THRESHOLD = 15;   // 같은 방향으로 이만큼 스크롤해야 동작
    const DIR_RESET  = 5;        // 이만큼 반대 방향이면 방향 전환으로 간주
    const MENU_CLOSE_DIST = 25;  // 메뉴 닫기에 필요한 스크롤 거리
    let menuCloseAccum = 0;      // 메뉴 닫기용 누적 거리 (방향 무관)

    const handleScroll = () => {
      if (rafId.current !== null) return; // 이미 rAF 예약됨 → 스킵 (throttle)
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;

        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY.current;

        // ── 메뉴 닫기 (방향 무관, 누적 거리 기준) ──
        menuCloseAccum += Math.abs(delta);
        if (menuCloseAccum > MENU_CLOSE_DIST) {
          if (isMenuOpenRef.current) setIsMenuOpen(false);
          if (isTopMenuOpenRef.current) setIsTopMenuOpen(false);
          menuCloseAccum = 0;
        }

        // ── 네비게이션 표시/숨김 (히스테리시스 포함) ──
        if (delta > DIR_RESET) {
          // 아래로 스크롤
          if (scrollDir.current !== 'down') {
            scrollDir.current = 'down';
            dirDistance.current = 0;
          }
          dirDistance.current += delta;

          if (dirDistance.current > HIDE_THRESHOLD && currentScrollY > 100) {
            setIsNavVisible(false);
          }
        } else if (delta < -DIR_RESET) {
          // 위로 스크롤
          if (scrollDir.current !== 'up') {
            scrollDir.current = 'up';
            dirDistance.current = 0;
          }
          dirDistance.current += Math.abs(delta);

          if (dirDistance.current > HIDE_THRESHOLD) {
            setIsNavVisible(true);
          }
        }
        // delta가 DIR_RESET 이하면 방향 모호 → 무시 (미세 떨림 방지)

        lastScrollY.current = currentScrollY;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, []); // 빈 의존성: ref로 상태를 읽으므로 재생성 불필요

  // 헤더 높이 계산 (CSS 변수 --header-height 업데이트)
  useEffect(() => {
    const headerNode = headerRef.current;
    if (!headerNode) return;

    const updateHeaderHeight = () => {
      if (headerNode) {
        document.documentElement.style.setProperty('--header-height', `${headerNode.offsetHeight}px`);
      }
    };

    updateHeaderHeight();
    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(headerNode);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return {
    isNavVisible,
    isFloatingNavVisible,
    headerRef,
    toggleFloatingNav
  };
}

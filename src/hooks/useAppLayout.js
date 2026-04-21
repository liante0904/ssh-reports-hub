import { useState, useEffect, useRef, useCallback } from 'react';
import { useReport } from '../context/ReportContext';

export function useAppLayout() {
  const { isMenuOpen, setIsMenuOpen, isTopMenuOpen, setIsTopMenuOpen } = useReport();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isFloatingNavVisible, setIsFloatingNavVisible] = useState(true);
  const lastScrollY = useRef(window.scrollY);
  const headerRef = useRef(null);

  const toggleFloatingNav = useCallback(() => setIsFloatingNavVisible(p => !p), []);

  // 리사이즈 감지 (모바일/데스크톱 플로팅 바 제어)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setIsFloatingNavVisible(true);
      } else {
        setIsFloatingNavVisible(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 스크롤 감지 (헤더/네비바 숨김 및 메뉴 닫기)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 스크롤 발생 시 모든 열려있는 메뉴 닫기
      if (Math.abs(currentScrollY - lastScrollY.current) > 20) {
        if (isMenuOpen) setIsMenuOpen(false);
        if (isTopMenuOpen) setIsTopMenuOpen(false);
      }

      // 내릴 때 숨기고 올릴 때 보여줌
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsNavVisible(false);
      } else {
        setIsNavVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMenuOpen, isTopMenuOpen, setIsMenuOpen, setIsTopMenuOpen]);

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

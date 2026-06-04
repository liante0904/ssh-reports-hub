import { useState, useEffect, useCallback } from 'react';

export function useGridOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleOverlay = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev;
      if (next) setSearchTerm('');
      return next;
    });
  }, []);

  const closeOverlay = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return {
    isOpen,
    searchTerm,
    setSearchTerm,
    toggleOverlay,
    closeOverlay,
    // 추가: 그리드 요약정보
    gridSummaryItems: [
      { label: '상태', value: isOpen ? '열림' : '닫힘', icon: isOpen ? '🔓' : '🔒' },
      ...(searchTerm ? [{ label: '검색', value: searchTerm, icon: '🔍' }] : []),
    ],
  };
}

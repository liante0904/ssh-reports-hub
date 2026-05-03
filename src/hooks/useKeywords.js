import { useState, useEffect, useCallback } from 'react';
import { useReport } from '../context/useReport';
import { CONFIG } from '../constants/config';
import { request } from '../utils/api';
import { DEV_AUTH_ENABLED } from '../utils/devAuth';

export const useKeywords = (telegramUser) => {
  const { logout } = useReport();
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [isKeywordOverlayOpen, setIsKeywordOverlayOpen] = useState(false);
  const [lastDeleted, setLastDeleted] = useState(null);

  const hasAuthToken = Boolean(localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN));
  const isDevBypassSession = DEV_AUTH_ENABLED && !hasAuthToken;

  const fetchKeywords = useCallback(async () => {
    if (!telegramUser) return;
    if (isDevBypassSession) {
      setKeywords([]);
      return;
    }

    setIsLoadingKeywords(true);
    try {
      const data = await request(`${CONFIG.API.BASE_URL}/keywords`, {}, logout);
      if (data) setKeywords(data.filter(k => k.is_active));
    } catch {
      // 에러는 request 내부에서 이미 로깅됨
    } finally {
      setIsLoadingKeywords(false);
    }
  }, [logout, telegramUser, isDevBypassSession]);

  const syncKeywords = async (updatedKeywords) => {
    if (isDevBypassSession) {
      setKeywords(updatedKeywords.map((keyword) => ({ keyword, is_active: true })));
      return;
    }

    try {
      const data = await request(`${CONFIG.API.BASE_URL}/keywords/sync`, {
        method: 'POST',
        body: JSON.stringify({ keywords: updatedKeywords })
      }, logout);
      if (data) setKeywords(data.filter(k => k.is_active));
    } catch {
      // 에러 로깅됨
    }
  };

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;

    if (keywords.some(k => k.keyword === trimmed)) {
      setNewKeyword('');
      return;
    }

    const nextKeywords = [...keywords.map(k => k.keyword), trimmed];
    setNewKeyword('');
    syncKeywords(nextKeywords);
  };

  const handleDeleteKeyword = (keywordToDelete) => {
    const nextKeywords = keywords
      .filter(k => k.keyword !== keywordToDelete)
      .map(k => k.keyword);

    setLastDeleted({ type: 'single', data: [keywordToDelete] });
    syncKeywords(nextKeywords);
  };

  const handleDeleteAllKeywords = () => {
    if (keywords.length === 0) return;
    if (!window.confirm('정말로 모든 키워드를 삭제하시겠습니까?')) return;

    const currentKeywords = keywords.map(k => k.keyword);
    setLastDeleted({ type: 'bulk', data: currentKeywords });
    syncKeywords([]);
  };

  const handleUndoDelete = () => {
    if (!lastDeleted) return;

    const currentKeywordList = keywords.map(k => k.keyword);
    const restoredKeywords = [...new Set([...currentKeywordList, ...lastDeleted.data])];

    syncKeywords(restoredKeywords);
    setLastDeleted(null);
  };

  const toggleKeywordOverlay = () => {
    setIsKeywordOverlayOpen(!isKeywordOverlayOpen);
    setLastDeleted(null);
  };

  useEffect(() => {
    if (telegramUser) {
      fetchKeywords();
    } else {
      setKeywords([]);
      setIsKeywordOverlayOpen(false);
    }
  }, [telegramUser, fetchKeywords]);

  return {
    keywords,
    newKeyword,
    setNewKeyword,
    isLoadingKeywords,
    isKeywordOverlayOpen,
    setIsKeywordOverlayOpen,
    lastDeleted,
    handleAddKeyword,
    handleDeleteKeyword,
    handleDeleteAllKeywords,
    handleUndoDelete,
    toggleKeywordOverlay,
    setKeywords
  };
};

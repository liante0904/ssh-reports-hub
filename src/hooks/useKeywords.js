import { useState, useEffect, useCallback } from 'react';
import { useReport } from '../context/ReportContext';

export const useKeywords = (telegramUser) => {
  const { logout } = useReport();
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [isKeywordOverlayOpen, setIsKeywordOverlayOpen] = useState(false);
  const [lastDeleted, setLastDeleted] = useState(null);

  const getApiConfig = useCallback(() => {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://ssh-oci.duckdns.org';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const token = localStorage.getItem('auth_token');
    return { cleanBaseUrl, token };
  }, []);

  const fetchKeywords = useCallback(async () => {
    const { cleanBaseUrl, token } = getApiConfig();
    if (!token) return;

    setIsLoadingKeywords(true);
    try {
      const response = await fetch(`${cleanBaseUrl}/keywords`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setKeywords(data.filter(k => k.is_active));
      }
    } catch (error) {
      console.error('❌ 키워드 조회 실패:', error);
    } finally {
      setIsLoadingKeywords(false);
    }
  }, [getApiConfig, logout]);

  const syncKeywords = async (updatedKeywords) => {
    const { cleanBaseUrl, token } = getApiConfig();
    if (!token) return;

    try {
      const response = await fetch(`${cleanBaseUrl}/keywords/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ keywords: updatedKeywords })
      });

      if (response.ok) {
        const data = await response.json();
        setKeywords(data.filter(k => k.is_active));
      } else if (response.status === 401) {
        logout();
      }
    } catch (error) {
      console.error('❌ 키워드 동기화 실패:', error);
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

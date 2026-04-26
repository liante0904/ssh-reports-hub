import { CONFIG } from '../constants/config';

/**
 * 전역 API 요청 유틸리티
 * @param {string} url 
 * @param {object} options 
 * @param {function} logout 
 * @returns {Promise<any>}
 */
export async function request(url, options = {}, logout) {
  const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
  const method = (options.method || 'GET').toUpperCase();
  
  const defaultHeaders = {};

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && method !== 'GET' && method !== 'HEAD') {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // 타임아웃 처리 (기본 10초)
  const timeoutSignal = AbortSignal.timeout(options.timeout || 10000);
  const signal = options.signal 
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;

  const mergedOptions = {
    ...options,
    method,
    signal,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, mergedOptions);

    if (response.status === 401) {
      if (logout) logout();
      throw new Error('인증이 만료되었습니다.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `요청 실패: ${response.status}`);
    }

    // 빈 응답 처리 (204 No Content 등)
    if (response.status === 204) return null;

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    console.error(`[API Error] ${url}:`, error.message);
    throw error;
  }
}

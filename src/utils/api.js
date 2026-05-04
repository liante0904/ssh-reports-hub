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
  const { skipAuth, ...requestOptions } = options;
  const method = (requestOptions.method || 'GET').toUpperCase();
  
  const defaultHeaders = {};

  if (token && !skipAuth) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && method !== 'GET' && method !== 'HEAD') {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // 타임아웃 처리 (기본 10초)
  let signal = requestOptions.signal;
  
  if (AbortSignal.timeout && AbortSignal.any) {
    const timeoutSignal = AbortSignal.timeout(requestOptions.timeout || 10000);
    signal = requestOptions.signal 
      ? AbortSignal.any([requestOptions.signal, timeoutSignal])
      : timeoutSignal;
  } else {
    // 대체 로직: AbortSignal.timeout/any가 없는 경우
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout || 10000);
    
    if (requestOptions.signal) {
      requestOptions.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        controller.abort();
      });
    }
    signal = controller.signal;
  }

  const mergedOptions = {
    ...requestOptions,
    method,
    signal,
    headers: {
      ...defaultHeaders,
      ...requestOptions.headers,
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

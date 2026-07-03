import { CONFIG } from '../constants/config';

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  🚨 API 호출 추가 시 반드시 아래 2개 파일도 같이 수정할 것  ║
 * ║                                                              ║
 * ║  1. API_REFERENCE.md          ← 엔드포인트 문서화            ║
 * ║  2. test/integration/api.test.js  ← 엔드포인트 테스트 추가   ║
 * ║                                                              ║
 * ║  CI 에서 test/verify-api-coverage.js 가 검증함.              ║
 * ║  빠뜨리면 PR 머지 불가.                                      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * 전역 API 요청 유틸리티
 * @param {string} url 
 * @param {object} options 
 * @param {function} logout 
 * @returns {Promise<any>}
 */
export async function request(url, options = {}, logout) {
  const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
  const { skipAuth, logoutOn401 = true, ...requestOptions } = options;
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

  const readErrorBody = async (response) => {
    const text = await response.clone().text().catch(() => '');
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { message: text.slice(0, 500) };
    }
  };

  // nginx reload 등 일시적 게이트웨이 오류 1회 재시도
  const GATEWAY_RETRY_CODES = [502, 503, 504];

  const doFetch = async (attempt) => {
    const response = await fetch(url, mergedOptions);
    if (GATEWAY_RETRY_CODES.includes(response.status) && attempt === 1) {
      await new Promise(r => setTimeout(r, 1000));
      return doFetch(2);
    }
    return response;
  };

  try {
    const response = await doFetch(1);

    if (response.status === 401) {
      const errorData = await readErrorBody(response);
      if (logout && logoutOn401) logout();
      throw new Error(errorData.message || errorData.error || '인증이 거부되었습니다.');
    }

    if (!response.ok) {
      const errorData = await readErrorBody(response);
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

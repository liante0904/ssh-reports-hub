const LOCAL_API_BASE_URL = 'http://localhost:8000';

export function normalizeApiBaseUrl(rawBaseUrl, fallbackBaseUrl = '') {
  if (!rawBaseUrl) return fallbackBaseUrl;

  const trimmedBaseUrl = rawBaseUrl.trim().replace(/\/+$/, '');

  try {
    const url = new URL(trimmedBaseUrl);
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);

    if (url.protocol === 'http:' && !isLocalHost) {
      url.protocol = 'https:';
    }

    return url.toString().replace(/\/+$/, '');
  } catch {
    return fallbackBaseUrl;
  }
}

export function getApiBaseUrl() {
  const env = import.meta.env || {};
  const fallbackBaseUrl = env.DEV ? LOCAL_API_BASE_URL : '';
  const baseUrl = normalizeApiBaseUrl(env.VITE_API_BASE_URL, fallbackBaseUrl);

  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL is required for production builds.');
  }

  return baseUrl;
}

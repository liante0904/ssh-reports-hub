const DEFAULT_API_BASE_URL = 'https://ssh-oci.duckdns.org';

export function getApiBaseUrl() {
  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
  const trimmedBaseUrl = rawBaseUrl.trim().replace(/\/+$/, '');

  try {
    const url = new URL(trimmedBaseUrl);
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);

    if (url.protocol === 'http:' && !isLocalHost) {
      url.protocol = 'https:';
    }

    return url.toString().replace(/\/+$/, '');
  } catch {
    return DEFAULT_API_BASE_URL;
  }
}


/**
 * 애플리케이션 전역 설정 및 환경 변수 관리
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ssh-oci.duckdns.org';
const REPORT_API_URL =
  import.meta.env.VITE_REPORT_API_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_ORACLE_REST_API ||
  'https://ssh-oci.duckdns.org/pub';
const VPN_ADDR = import.meta.env.VITE_VPN_ADDR;
const TELEGRAM_BOT_ID = import.meta.env.VITE_TELEGRAM_BOT_ID || '1372612160';
const TELEGRAM_BOT_NAME = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'ebest_noti_bot';
const TABLE_NAME = import.meta.env.VITE_TABLE_NAME || 'api';

export const CONFIG = {
  // API 관련
  API: {
    BASE_URL: API_BASE_URL.replace(/\/$/, ''),
    REPORT_API_URL: REPORT_API_URL.replace(/\/$/, ''),
    COMPANIES_URL: `${API_BASE_URL.replace(/\/$/, '')}/pub/api/companies`,
    BOARDS_URL: `${API_BASE_URL.replace(/\/$/, '')}/pub/api/boards`,
    TABLE_NAME: TABLE_NAME.replace(/^\//, '').replace(/\/$/, ''),
  },
  
  // 관리자/VPN 관련
  VPN: {
    ADDR: VPN_ADDR,
    getAdminUrl: (path) => `https://${VPN_ADDR}${path.startsWith('/') ? path : '/' + path}`,
  },
  
  // 텔레그램 관련
  TELEGRAM: {
    BOT_ID: TELEGRAM_BOT_ID,
    BOT_NAME: TELEGRAM_BOT_NAME,
    getAuthUrl: (userId) => `https://t.me/${TELEGRAM_BOT_NAME}${userId ? `?start=${userId}` : ''}`,
  },

  // 로컬 스토리지 키
  STORAGE_KEYS: {
    AUTH_TOKEN: 'auth_token',
    TELEGRAM_USER: 'telegram_user',
    THEME: 'theme',
  }
};

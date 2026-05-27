import { CONFIG } from '../constants/config';

export const DEV_AUTH_ENABLED = import.meta.env.DEV;

const DEV_TELEGRAM_USER = {
  id: 0,
  first_name: 'Dev',
  username: 'local-dev',
};

export function createDevTelegramUser(overrides = {}) {
  return { ...DEV_TELEGRAM_USER, ...overrides };
}

export function persistTelegramUser(user) {
  localStorage.setItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER, JSON.stringify(user));
}

export function clearTelegramUser() {
  localStorage.removeItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
}

import { useCallback, useState } from 'react';
import { CONFIG } from '../constants/config';
import { request } from '../utils/api';
import { createDevTelegramUser } from '../utils/devAuth';
import { useReport } from '../context/useReport';

function extractAuthToken(result) {
  if (!result || typeof result !== 'object') return null;
  return result.access_token || result.token || result.auth_token || result.jwt || null;
}

export function useTelegramAuth() {
  const { telegramUser, setTelegramUser } = useReport();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const persistAuth = useCallback((token, user) => {
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
    if (token) localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER, JSON.stringify(user));
    localStorage.setItem(CONFIG.STORAGE_KEYS.REMEMBER_ME, 'true');
  }, []);

  const loginWithTelegram = useCallback(() => {
    if (!window.Telegram || !window.Telegram.Login) {
      alert('텔레그램 스크립트가 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const botId = CONFIG.TELEGRAM.BOT_ID;
    if (!botId) return;

    window.Telegram.Login.auth(
      { bot_id: botId, request_access: 'write', embed: 1 },
      async (user) => {
        if (!user) return;
        setIsAuthenticating(true);
        try {
          const result = await request(`${CONFIG.API.BASE_URL}/external/auth/telegram`, {
            method: 'POST',
            skipAuth: true,
            logoutOn401: false,
            body: JSON.stringify(user),
          });

          if (result) {
            const authToken = extractAuthToken(result);
            if (!authToken) {
              console.warn('[Telegram Auth] Auth response did not include a token field.', result);
            }
            const userData = { ...user, ...(result.user || {}) };
            setTelegramUser(userData);
            persistAuth(authToken, userData);
          }
        } catch (error) {
          console.error('[Telegram Auth] login failed:', error);
        } finally {
          setIsAuthenticating(false);
        }
      }
    );
  }, [persistAuth, setTelegramUser]);

  const loginWithDevBypass = useCallback(() => {
    const devUser = createDevTelegramUser();
    setTelegramUser(devUser);
    persistAuth(null, devUser);
  }, [persistAuth, setTelegramUser]);

  const loginWithTelegramApp = useCallback(() => {
    const startParam = telegramUser ? telegramUser.id : '';
    window.open(CONFIG.TELEGRAM.getAuthUrl(startParam), '_blank');
  }, [telegramUser]);

  return {
    isAuthenticating,
    loginWithTelegram,
    loginWithTelegramApp,
    loginWithDevBypass,
  };
}

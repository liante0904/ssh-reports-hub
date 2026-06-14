import React, { useEffect, useState } from 'react';
import { CONFIG } from '../constants/config';
import { request } from '../utils/api';
import { useReport } from '../context/useReport';

/**
 * 로그인 페이지 — Telegram OAuth 또는 승인 대기 화면.
 * RequireAuth에서 미인증 시 자동 노출.
 */
export default function LoginPage({ reason, user }) {
  const { setTelegramUser } = useReport();
  const [checking, setChecking] = useState(false);

  // Telegram redirect 파라미터에서 인증 정보 복원
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tgId = params.get('tg_id');
    if (!tgId) return;

    setChecking(true);
    const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.id) {
          setTelegramUser(u);
          window.location.replace('/');
          return;
        }
      } catch {}
    }
    setChecking(false);
  }, []);

  if (reason === 'pending_approval' && user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>승인 대기 중</h2>
          <p style={styles.subtitle}>
            {user.first_name || 'User'}님의 계정이 아직 승인되지 않았습니다.
          </p>
          <p style={styles.text}>관리자 승인 후 이용 가능합니다.</p>
          <button style={styles.button} onClick={() => {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
            window.location.reload();
          }}>
            다시 로그인
          </button>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.subtitle}>로그인 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>리포트 허브</h2>
        <p style={styles.subtitle}>증권사 리서치 리포트 통합 뷰어</p>
        <p style={styles.text}>
          서비스 이용을 위해 텔레그램 로그인이 필요합니다.
        </p>
        <button
          style={styles.button}
          onClick={() => {
            const botName = CONFIG.TELEGRAM_BOT_NAME || 'ebest_noti_bot';
            const redirect = encodeURIComponent(window.location.origin + '/?tg_login=1');
            window.location.href = `https://t.me/${botName}?start=login_${encodeURIComponent(window.location.origin)}`;
          }}
        >
          텔레그램으로 로그인
        </button>
        <p style={styles.small} onClick={() => {
          const botName = CONFIG.TELEGRAM_BOT_NAME || 'ebest_noti_bot';
          window.open(`https://t.me/${botName}`, '_blank');
        }}>
          @{CONFIG.TELEGRAM_BOT_NAME || 'ebest_noti_bot'} 에서 /start 입력 후 다시 시도하세요.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#f5f5f5',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  title: { fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0' },
  subtitle: { fontSize: '16px', color: '#666', margin: '0 0 16px 0' },
  text: { fontSize: '14px', color: '#888', margin: '0 0 24px 0' },
  button: {
    width: '100%', padding: '12px', background: '#1976d2', color: 'white',
    border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer',
  },
  small: { fontSize: '11px', color: '#999', margin: '12px 0 0 0', cursor: 'pointer' },
};

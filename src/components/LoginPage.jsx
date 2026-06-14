import React, { useEffect, useState } from 'react';
import { CONFIG } from '../constants/config';
import { useReport } from '../context/useReport';

/**
 * 로그인 페이지 — Telegram 인증 또는 승인 대기 화면.
 * RequireAuth에서 미인증 시 자동 노출.
 * 승인은 DB에서 관리자가 수동으로 status='active' 변경.
 */
export default function LoginPage({ reason, user }) {
  const { telegramUser } = useReport();
  const [checking, setChecking] = useState(false);

  // 승인 대기 중 주기적 상태 확인 (2분마다)
  useEffect(() => {
    if (reason !== 'pending_approval' || !user?.id) return;
    const interval = setInterval(() => {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
      if (stored) {
        try {
          const u = JSON.parse(stored);
          if (u.status === 'active') window.location.reload();
        } catch {}
      }
    }, 120000); // 2분
    return () => clearInterval(interval);
  }, [reason, user]);

  if (reason === 'pending_approval' && user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>승인 대기 중</h2>
          <p style={styles.subtitle}>
            {user.first_name || user.username || 'User'}님의 계정이 아직 승인되지 않았습니다.
          </p>
          <p style={styles.text}>
            관리자가 승인하면 자동으로 접근 가능합니다.<br />
            승인 완료 후 이 페이지를 새로고침하세요.
          </p>
          <button style={styles.button} onClick={() => window.location.reload()}>
            새로고침
          </button>
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
          승인된 텔레그램 계정만 이용 가능합니다.
        </p>
        <button
          style={styles.button}
          onClick={() => {
            const botName = CONFIG.TELEGRAM_BOT_NAME || 'ebest_noti_bot';
            window.open(`https://t.me/${botName}`, '_blank');
          }}
        >
          텔레그램 봇에서 /start 입력
        </button>
        <p style={styles.small}>
          @{CONFIG.TELEGRAM_BOT_NAME || 'ebest_noti_bot'} 에서 /start 입력 후<br />
          관리자에게 승인 요청하세요.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5', padding: '20px' },
  card: { background: 'white', borderRadius: '12px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  title: { fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0' },
  subtitle: { fontSize: '16px', color: '#666', margin: '0 0 16px 0' },
  text: { fontSize: '14px', color: '#888', margin: '0 0 24px 0', lineHeight: '1.6' },
  button: { width: '100%', padding: '12px', background: '#1976d2', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' },
  small: { fontSize: '11px', color: '#999', margin: '12px 0 0 0', lineHeight: '1.6' },
};

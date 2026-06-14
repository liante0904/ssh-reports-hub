import React, { useEffect, useState } from 'react';
import { CONFIG } from '../constants/config';
import { useReport } from '../context/useReport';

/**
 * 로그인 페이지 — Telegram 인증 또는 승인 대기 화면.
 * RequireAuth에서 미인증 시 자동 노출.
 */
export default function LoginPage({ reason, user }) {
  const BOT = CONFIG.TELEGRAM_BOT_NAME || 'ebest_noti_bot';
  const BOT_LINK = `https://t.me/${BOT}`;

  // 승인 대기 중 주기적 확인
  useEffect(() => {
    if (reason !== 'pending_approval' || !user?.id) return;
    const interval = setInterval(() => {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.TELEGRAM_USER);
      if (stored) {
        try {
          if (JSON.parse(stored).status === 'active') window.location.reload();
        } catch {}
      }
    }, 120000);
    return () => clearInterval(interval);
  }, [reason, user]);

  // 승인 대기 화면
  if (reason === 'pending_approval') {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <div style={s.icon}>⏳</div>
          <h2 style={s.title}>승인 대기 중</h2>
          <p style={s.sub}>{(user || {}).first_name || 'User'}님, 관리자 승인 후 이용 가능합니다.</p>
          <button style={s.btn} onClick={() => window.location.reload()}>새로고침</button>
          <a href="/" style={s.link}>메인으로 돌아가기</a>
        </div>
      </div>
    );
  }

  // 로그인 화면
  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.icon}>📊</div>
        <h2 style={s.title}>리포트 허브</h2>
        <p style={s.sub}>증권사 리서치 리포트 통합 뷰어</p>

        <button style={{ ...s.btn, background: '#0088cc' }} onClick={() => window.open(BOT_LINK, '_blank')}>
          텔레그램으로 로그인
        </button>
        <p style={s.hint}>
          <a href={BOT_LINK} target="_blank" rel="noopener">@{BOT}</a> 에서 인증 후 이용 가능합니다.
        </p>
        <a href="/" style={s.link}>메인으로 돌아가기</a>
      </div>
    </div>
  );
}

const s = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5', padding: '20px' },
  card: { background: 'white', borderRadius: '12px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  icon: { fontSize: '48px', marginBottom: '16px' },
  title: { fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0' },
  sub: { fontSize: '15px', color: '#666', margin: '0 0 24px 0' },
  btn: { width: '100%', padding: '14px', background: '#1976d2', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' },
  hint: { fontSize: '12px', color: '#999', margin: '12px 0 0 0' },
  link: { fontSize: '12px', color: '#1976d2', display: 'block', marginTop: '12px', textDecoration: 'none' },
};

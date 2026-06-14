import React from 'react';
import { useReport } from '../context/useReport';
import LoginPage from './LoginPage';

/**
 * Protected route wrapper — 로그인 + 승인된 회원만 접근.
 * 모든 페이지에 점진적 적용 가능하도록 설계.
 *
 * 사용법:
 *   <Route path="/" element={<RequireAuth><HomeDashboard /></RequireAuth>} />
 */
export default function RequireAuth({ children }) {
  const { telegramUser } = useReport();

  // 미로그인 or 승인 대기
  if (!telegramUser || !telegramUser.id) {
    return <LoginPage reason="not_logged_in" />;
  }

  if (telegramUser.status !== 'active') {
    return <LoginPage reason="pending_approval" user={telegramUser} />;
  }

  return children;
}

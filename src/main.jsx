import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 브라우저의 자동 스크롤 복원 기능 비활성화
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// 카카오 SDK 초기화
const KAKAO_KEY = import.meta.env.VITE_KAKAO_JS_KEY;
if (window.Kakao && KAKAO_KEY && !window.Kakao.isInitialized()) {
  window.Kakao.init(KAKAO_KEY);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
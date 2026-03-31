import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    // Gzip 압축 (브라우저가 가장 널리 지원)
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // Brotli 압축 (더 높은 압축률, 최신 브라우저 지원)
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  publicDir: 'public',
  build: {
    // 소스 맵 제거로 빌드 속도 향상 및 보안 강화
    sourcemap: false,
    // 500kb 이상의 청크 경고 설정
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 매뉴얼 청크 분리: 벤더 라이브러리(React 등)를 별도 파일로 분리하여 캐싱 효율 극대화
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('react-router-dom')) return 'vendor-router';
            return 'vendor'; // 기타 라이브러리
          }
        },
        // 에셋 파일 이름 규칙
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
      },
    },
  },
})

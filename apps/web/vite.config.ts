import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 워크스페이스 TS 패키지를 소스로 처리(프리번들 제외)
  optimizeDeps: { exclude: ['@sam2/engine', '@sam2/shared'] },
  server: { port: 5173 },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 프로젝트 페이지는 /<repo>/ 하위 경로로 서비스된다.
  // 배포 시 VITE_BASE=/new-sam2/ 를 주입(로컬은 '/').
  base: process.env.VITE_BASE ?? '/',
  // 워크스페이스 TS 패키지를 소스로 처리(프리번들 제외)
  optimizeDeps: { exclude: ['@sam2/engine', '@sam2/shared'] },
  server: { port: 5173 },
});

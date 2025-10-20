import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // 개발 서버 설정
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },

  // 빌드 설정
  build: {
    outDir: '../src/main/resources/static',  // Spring Boot static 폴더로 직접 빌드
    emptyOutDir: true,  // 빌드 전 폴더 비우기
    sourcemap: false   // 프로덕션에서는 소스맵 제거
  },
})
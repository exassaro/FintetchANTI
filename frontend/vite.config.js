import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: ["selenitical-hemitropic-grayson.ngrok-free.dev"],
    proxy: {
      // All API calls are prefixed with /api to avoid conflicting with
      // React Router frontend routes (/dashboard, /kpi, /review, etc.).
      // The rewrite function strips the /api prefix before forwarding.

      // Auth service (8004)
      '/api/auth': {
        target: 'http://localhost:8004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Classification service (8001)
      '/api/classify': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Anomaly service (8002)
      '/api/anomaly': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Analytics service (8003) — all analytics routes
      '/api/dashboard': { target: 'http://localhost:8003', changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
      '/api/kpi': { target: 'http://localhost:8003', changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
      '/api/forecast': { target: 'http://localhost:8003', changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
      '/api/time-series': { target: 'http://localhost:8003', changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
      '/api/distribution': { target: 'http://localhost:8003', changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
      '/api/review': { target: 'http://localhost:8003', changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
      '/api/chatbot': { target: 'http://localhost:8003', changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
      '/api/explain': { target: 'http://localhost:8003', changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
      '/api/news': { target: 'http://localhost:8003', changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
    },
  },
})

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env files (VITE_* variables) based on current mode
  const env = loadEnv(mode, process.cwd(), '')

  // Backend service URLs — read from env with localhost fallbacks
  const AUTH_URL         = env.VITE_AUTH_URL           || 'http://localhost:8004'
  const CLASSIFICATION_URL = env.VITE_CLASSIFICATION_URL || 'http://localhost:8001'
  const ANOMALY_URL      = env.VITE_ANOMALY_URL        || 'http://localhost:8002'
  const ANALYTICS_URL    = env.VITE_ANALYTICS_URL      || 'http://localhost:8003'
  const RETRAINING_URL   = env.VITE_RETRAINING_URL     || 'http://localhost:8005'

  // Shared rewrite: strips the /api prefix before forwarding
  const rewrite = (path) => path.replace(/^\/api/, '')

  return {
    plugins: [react()],
    server: {
      port: 3000,
      allowedHosts: ['selenitical-hemitropic-grayson.ngrok-free.dev'],
      proxy: {
        // All API calls are prefixed with /api to avoid conflicting with
        // React Router frontend routes (/dashboard, /kpi, /review, etc.).
        // The rewrite function strips the /api prefix before forwarding.

        // Auth service
        '/api/auth': {
          target: AUTH_URL,
          changeOrigin: true,
          rewrite,
        },
        // Classification service
        '/api/classify': {
          target: CLASSIFICATION_URL,
          changeOrigin: true,
          rewrite,
        },
        // Anomaly service
        '/api/anomaly': {
          target: ANOMALY_URL,
          changeOrigin: true,
          rewrite,
        },
        // Analytics service — all analytics routes
        '/api/dashboard':    { target: ANALYTICS_URL, changeOrigin: true, rewrite },
        '/api/kpi':          { target: ANALYTICS_URL, changeOrigin: true, rewrite },
        '/api/forecast':     { target: ANALYTICS_URL, changeOrigin: true, rewrite },
        '/api/time-series':  { target: ANALYTICS_URL, changeOrigin: true, rewrite },
        '/api/distribution': { target: ANALYTICS_URL, changeOrigin: true, rewrite },
        '/api/review':       { target: ANALYTICS_URL, changeOrigin: true, rewrite },
        '/api/chatbot':      { target: ANALYTICS_URL, changeOrigin: true, rewrite },
        '/api/explain':      { target: ANALYTICS_URL, changeOrigin: true, rewrite },
        '/api/news':         { target: ANALYTICS_URL, changeOrigin: true, rewrite },
        // Retraining service
        '/api/retraining':   { target: RETRAINING_URL, changeOrigin: true, rewrite },
      },
    },
  }
})

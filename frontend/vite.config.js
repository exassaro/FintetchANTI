import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy /classify/* → Classification service (8001)
      '/classify': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      // Proxy /anomaly/* → Anomaly service (8002)
      '/anomaly': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      },
      // Proxy analytics routes → Analytics service (8003)
      '/dashboard': { target: 'http://localhost:8003', changeOrigin: true },
      '/kpi': { target: 'http://localhost:8003', changeOrigin: true },
      '/forecast': { target: 'http://localhost:8003', changeOrigin: true },
      '/time-series': { target: 'http://localhost:8003', changeOrigin: true },
      '/distribution': { target: 'http://localhost:8003', changeOrigin: true },
      '/review': { target: 'http://localhost:8003', changeOrigin: true },
      '/chatbot': { target: 'http://localhost:8003', changeOrigin: true },
      '/explain': { target: 'http://localhost:8003', changeOrigin: true },
    },
  },
})

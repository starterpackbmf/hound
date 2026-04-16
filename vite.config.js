import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, the frontend calls /api/* — Vite proxies those to the local Express
// server (proxy.js) on port 3001, rewriting the path to drop the /api prefix.
// In production (Vercel), /api/* is served by serverless functions under api/.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/app/',
  plugins: [
    react(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@daily-co')) return 'stream-webrtc';
          if (id.includes('node_modules/@supabase'))  return 'db-connector';
          if (id.includes('node_modules/posthog-js') || id.includes('node_modules/@sentry')) return 'app-insights';
          if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-router')) return 'core-libs';
        },
      },
    },
  },
})

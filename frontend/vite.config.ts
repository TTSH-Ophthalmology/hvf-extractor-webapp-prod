import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Single source of truth for the app version is the VERSION file at the
// project root, read here at build/dev-server start time and injected as a
// global constant (see src/vite-env.d.ts for its type declaration).
const appVersion = readFileSync(
  fileURLToPath(new URL('../VERSION', import.meta.url)),
  'utf-8',
).trim()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api requests to the FastAPI backend during development.
      // This avoids CORS issues without needing to configure backend headers.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

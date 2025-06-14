import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'

// Configuración base
const config = {
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: '0.0.0.0',
      port: 3000
    },
    https: {
      key: fileURLToPath(new URL('./ssl/key.pem', import.meta.url)),
      cert: fileURLToPath(new URL('./ssl/cert.pem', import.meta.url))
    }
  },
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
}

export default defineConfig(config)
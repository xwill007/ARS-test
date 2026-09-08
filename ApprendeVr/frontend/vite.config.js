import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permite conexiones desde cualquier IP
    port: 3000,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'ssl/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'ssl/cert.pem')),
    },
    // Reenvía /api al backend NestJS (plano HTTP, puerto 3001). Evita mixed-content: el
    // navegador solo habla con este servidor Vite en HTTPS; Vite reenvía la petición por HTTP
    // internamente hacia Nest.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        mobile: path.resolve(__dirname, 'src/views/mobile/mobile.html'),
        aframe: path.resolve(__dirname, 'src/views/A-frame/index.html'),
        // Requerimiento 011: overlay de prueba que importa componentes A-Frame reales como
        // src/views/A-frame/index.html, para validar que se pueden reusar sin copiar código.
        aframeOverlayModules: path.resolve(__dirname, 'src/views/ARs/ARScomponents/ARStest/mirror-fix/aframe-overlay-modules.html')
      }
    }
  }
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const httpsCertDir = path.resolve(__dirname, 'ssl')
const certPath = path.join(httpsCertDir, 'cert.pem')
const keyPath = path.join(httpsCertDir, 'key.pem')
const useHttps = process.env.VITE_USE_HTTPS === 'true' && fs.existsSync(certPath) && fs.existsSync(keyPath)

const httpsConfig = useHttps
  ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
  : undefined

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '../..'), // Carga .env desde la raíz del proyecto
  server: {
    host: '0.0.0.0', // Permite conexiones desde cualquier IP
    port: 3000,
    https: httpsConfig,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        mobile: path.resolve(__dirname, 'src/views/mobile/mobile.html'),
        aframe: path.resolve(__dirname, 'src/views/A-frame/index.html')
      }
    }
  }
})
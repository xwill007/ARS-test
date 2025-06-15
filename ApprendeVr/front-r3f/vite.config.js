import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '192.168.1.11',
    port: 3000,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'ssl/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'ssl/cert.pem')),
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        mobile: path.resolve(__dirname, 'mobile.html'),
        aframe: path.resolve(__dirname, 'A-frame/index.html') // Updated path
      }
    }
  },
  resolve: {
    alias: {
      '@aframe': path.resolve(__dirname, 'A-frame') // Updated alias
    }
  }
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    // Eliminamos la configuración de HTTPS temporalmente
    // para asegurar que la aplicación se inicie
    hmr: {
      host: 'localhost'
    }
  }
})
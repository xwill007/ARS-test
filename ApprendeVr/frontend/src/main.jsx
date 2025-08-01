import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import App from './App'
import './index.css'
import { registerServiceWorker } from './config/ssl-config'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Registrar el service worker para PWA/offline de forma segura
window.addEventListener('load', () => {
  registerServiceWorker();
});

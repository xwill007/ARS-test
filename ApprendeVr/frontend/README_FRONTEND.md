# ARS-test — Frontend

Aplicación React + Vite con **React Three Fiber**, **A-Frame** y **WebXR** para experiencias de Realidad Aumentada Estereoscópica y VR desde el navegador.

## Stack

| Capa | Tecnología |
|------|-----------|
| UI | React 18, React Router 7 |
| 3D Engine | Three.js 0.153, @react-three/fiber 8.13, @react-three/drei |
| VR/XR | A-Frame, @react-three/xr 5.6 |
| Física | @react-three/rapier |
| Build | Vite 4.4 (multi-entry) |
| Idioma | i18next + VRLanguageContext (ES / EN / PT-BR) |
| Testing | No configurado (solo ESLint) |

## Desarrollo

```bash
# Dependencias
npm install

# Servidor dev (localhost)
npx vite --host 0.0.0.0 --port 3000

# Con HTTPS
npx vite --host 0.0.0.0 --port 3000 --https
```

## Vistas

| Vista | Entry point | Tecnología |
|-------|------------|-----------|
| **Principal** | `index.html` → `src/main.jsx` → `App.jsx` | R3F |
| **Mobile** | `src/views/mobile/mobile.html` | R3F + WebXR |
| **A-Frame** | `src/views/A-frame/index.html` | A-Frame |
| **AR Estéreo** | `src/views/ARs/index.html` | R3F + cámara |

## Estructura

```
src/
├── components/
│   ├── VRConfig/        # Config (idioma, tema, display)
│   ├── VRDisplay.jsx    # Panel de control principal
│   ├── VRUser/          # Cámara, avatar, controles, raycaster
│   ├── VRViews/         # VRDomo, VRButton, VideoBox, video players
│   └── VRWorld/         # Suelo, mundo 3D
├── views/
│   ├── mobile/          # Vista Mobile (R3F + XR)
│   ├── A-frame/         # Vista A-Frame pura
│   └── ARs/             # Vista AR Estéreo (cámara + overlays)
├── config/              # Config AR estéreo, temas
├── locales/             # en.json, es.json, br.json
├── main.jsx             # Entry point principal (React 18 + i18n + Service Worker)
└── i18n.js              # Config i18next
```

## Build

Vite genera 3 entry points definidos en `vite.config.js`:

- `main` → `index.html`
- `mobile` → `src/views/mobile/mobile.html`
- `aframe` → `src/views/A-frame/index.html`

## SSL / HTTPS

Los certificados auto-firmados van en `ssl/` (generados por `scripts/generate-ssl.bat`).  
`vite.config.js` usa `VITE_USE_HTTPS` del entorno para activar HTTPS en el dev server.

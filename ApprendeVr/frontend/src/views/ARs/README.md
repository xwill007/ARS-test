# ARs View — Arquitectura y Guía de Desarrollo

## Stack

| Capa | Tecnología |
|------|-----------|
| UI base | React 18 + Vite |
| 3D world | `@react-three/fiber` (R3F) + `@react-three/drei` |
| AR web standard | WebXR (`@react-three/xr`) |
| AR legacy (estéreo) | A-Frame 1.4.2 (iframes embebidos) |
| Voz | Web Speech API (`webkitSpeechRecognition`) |
| Persistencia | `localStorage` + archivo `config_Ars.json` |

## Estructura de Archivos

```
views/ARs/
├── index.html           # Entry point HTML
├── index.jsx            # ReactDOM.createRoot
├── index.css            # Estilos globales de la view
├── appArs.jsx            # Componente raíz — orquesta la escena 3D + overlays + AR
├── hooks/
│   └── useAROverlays.js # Hook para gestionar overlays (wrapper alrededor de AROverlayManager)
├── ARSviews/
│   ├── ARSstereoView.jsx # Vista estéreo AR legacy (cámara + 2 paneles A-Frame)
│   ├── ARStrackingView.jsx # Vista WebXR con hit-test (experimental)
│   └── XRStereoView.jsx # Vista WebXR con 2 paneles simulados
├── ARScomponents/
│   ├── AROverlayController.jsx  # Controlador principal de overlays (con persistencia)
│   ├── AROverlayManager.jsx     # Gestor de overlays (sin persistencia, más simple)
│   ├── OverlayRegistry.js       # Registro singleton SOLID de overlays
│   ├── OverlayDropdownMenu.jsx  # Menú desplegable con checkboxes
│   ├── OverlayConfigPanel.jsx   # Panel de configuración de overlay activo
│   ├── ARSExperience.jsx        # Botón flotante + orquestación de la vista estéreo
│   ├── ARSConfig.jsx            # Panel de configuración AR (separación, zoom, etc.)
│   ├── StereoARView.jsx         # Vista estéreo temprana (legacy)
│   ├── StereoARPanel.jsx        # Panel individual (legacy)
│   ├── ARPanel.jsx              # Panel individual actual (soporta r3f, html, mixed)
│   ├── ConfigurableOverlayManager.js # Gestor de overlays configurables
│   ├── overlays/
│   │   ├── index.js             # Auto-registro de todos los overlays
│   │   ├── SimpleTextOverlay.jsx
│   │   ├── RotatingCubeOverlay.jsx
│   │   ├── CubeOverlay.jsx
│   │   ├── VRLocalVideoOverlay.jsx    # Video local A-Frame con controles de voz
│   │   ├── CombinedAFrameOverlay.jsx  # Cono + Video en una escena A-Frame
│   │   ├── VRVoiceController.jsx      # Control de voz para overlays A-Frame
│   │   └── OptimizedOverlayWrapper.jsx # Wrapper para optimización estéreo
│   ├── VRWorldArs/
│   │   ├── VRWorlsArs.jsx       # Mundo 3D base (suelo + límites)
│   │   └── VRPlaneArs.jsx
│   ├── VRUserArs/
│   │   ├── VRUserArs.jsx        # Componente de usuario (cámara, cuerpo, cursor, movimiento)
│   │   ├── VRCameraArs.jsx
│   │   ├── VRCursorArs.jsx
│   │   ├── VRMoveControlsArs.jsx
│   │   ├── VRControlMobilArs.jsx
│   │   ├── VRControlWebArs.jsx
│   │   └── ...más subcomponentes
│   ├── VoiceController.jsx      # Control de voz global (no A-Frame, overlay React)
│   └── ...más utilidades
└── README.md (este archivo)
```

## Flujo de la Aplicación

```
index.html → index.jsx → appArs.jsx
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         AROverlayController  Canvas     ARSExperience
         (overlays, menú,  (R3F scene)  (botón flotante → ARStereoView)
          configuración)
              │             │
         OverlayDropdown  VRWorldArs
         Menu + Config    → VRUserArs (cámara, cursor, movimiento)
                              │
                         overlayComponents.r3f (hijos)
```

### Modo Normal (sin AR)
- Se renderiza un canvas R3F con un mundo 3D (suelo, cielo, luz).
- `VRUserArs` maneja cámara en primera persona, movimiento con teclado/ratón, cursor.
- Los overlays R3F seleccionados se renderizan como hijos de `VRUserArs`.
- Los overlays HTML/A-Frame se renderizan en un div absoluto superpuesto (`z-index: 2`).
- El menú desplegable permite activar/desactivar overlays en tiempo real.

### Modo AR Estéreo (ARStereoView)
- Al hacer clic en el botón flotante, `ARSExperience` monta `ARStereoView`.
- `ARStereoView` accede a la cámara trasera (`facingMode: environment`).
- Muestra **dos paneles** lado a lado (uno por ojo) con el mismo stream de video.
- Cada panel (`ARPanel`) superpone los overlays sobre el video.
- Soporta modos de optimización: espejo del panel derecho, silenciar panel secundario, resolución configurable.

## Sistema de Overlays

### Registro (OverlayRegistry)
Singleton basado en principios SOLID. Registra overlays con:
- `component`: Componente React
- `type`: `'r3f'` | `'html'` (A-Frame vía iframe)
- `label`, `description`, `category`, `defaultProps`

### Cómo agregar un nuevo overlay
1. Crear el componente en `overlays/` (si es R3F y simple) o en `ARStest/` / `a-frame-components-ars/`.
2. Importarlo y registrarlo en `overlays/index.js`:
   ```js
   overlayRegistry.register('miOverlay', {
     component: MiOverlay,
     type: 'r3f',
     label: 'Mi Overlay',
     category: 'geometry',
     defaultProps: { position: [0, 1, -2] }
   });
   ```
3. Aparece automáticamente en el menú desplegable. No hay que tocar controladores.

### Tipos de overlay
- **R3F** (`type: 'r3f'`): Componente React Three Fiber que se renderiza dentro del canvas 3D principal. Ej: cubos, esferas, texto 3D.
- **HTML** (`type: 'html'`): Componente que embebe una escena A-Frame via `iframe` + `srcDoc`. Ej: Cono de Palabras, Video Local. Tienen su propia escena 3D independiente del canvas R3F.

## Modo Estéreo (ARStereoView)

### ARPanel
Cada ojo tiene un `ARPanel` que contiene:
1. **Video** (`<video>`): stream de la cámara trasera.
2. **Overlay HTML/A-Frame**: superpuesto con `z-index: 2`, `pointerEvents: none`.
3. **Canvas R3F embebido**: para overlays de tipo `r3f`, se crea un canvas separado dentro del panel.

### Optimizaciones estéreo
- **`mirrorRightPanel`**: reemplaza el panel derecho con un `<canvas>` 2D que copia el frame del video (sin escena 3D adicional). Ahorra renderizado.
- **`muteRightPanel`**: silencia el audio del video en el panel derecho.
- **`singleCursor`**: controla si se muestran cursores en uno o ambos paneles.
- **Resolución de cámara configurable**: 480p, 720p, 1080p, 4K.

### Configuración
- `ARSConfigManager` (singleton): carga/guarda configuración desde `config_Ars.json` + `localStorage`.
- Detecta tipo de dispositivo (mobile, tablet, desktop) y ajusta defaults.
- Persiste separación, tamaño de paneles, resolución, overlays seleccionados.

## Controles de Voz

### VoiceController (React, overlay independiente)
- Componente React que usa `webkitSpeechRecognition`.
- Aparece como badge flotante en la esquina superior derecha.
- Escucha comandos: `play`, `pause`, `stop`, `reproducir`, `pausar`, etc.
- Callback `onCommand(command, transcript)` para conectar con cualquier overlay.

### VRVoiceController (A-Frame, embebido en overlays HTML)
- Se inyecta como `iframe` con una escena A-Frame completa.
- Registra componentes A-Frame: `vr-voice-control`, `vr-mic-gaze-control`, `vr-mic-icon`.
- Soporta interacción por mirada (gaze): mantener la mirada 3s sobre el micrófono lo activa.
- Comandos por defecto: play, pause, stop, mute, unmute (en español e inglés).
- Se comunica con el overlay objetivo via `targetEntityId` + `targetComponent`.

## Dependencias Externas

| Paquete | Uso |
|---------|-----|
| `@react-three/fiber` | Renderizador 3D base |
| `@react-three/drei` | Utilidades R3F (Sky, etc.) |
| `@react-three/xr` | WebXR (AR/VR nativo) |
| `aframe` (v1.4.2) | Escenas 3D legacy para overlays HTML |
| `html2canvas` | Captura de overlays para mirror panel |

## Buenas Prácticas para Nuevos Cambios

1. **Overlays**: siempre registrar en `overlays/index.js`, nunca hardcodear en controladores.
2. **Persistencia**: usar `ARSConfigManager` (no `localStorage` directo).
3. **Overlays A-Frame HTML**: usar `VRLocalVideoOverlay` como referencia — maneja `showCursor`, `isPrimaryPanel`, `voiceCommandsActivated`.
4. **Rendimiento estéreo**: si agregas lógica por ojo, verifica `isPrimaryPanel` / `isRightPanel`.
5. **Logs**: la app tiene `ShowLogs` en `ARSConfigManager` y `ENABLE_LOGS` en `VRUserArs`. No dejar logs permanentes en producción.
6. **No romper transitions**: los overlays usan `key` estable (`${overlayKey}-component`) para evitar reseteos del DOM.

## Puntos de Entrada para Cambios Comunes

- **Agregar overlay visual**: crear componente + registrar en `overlays/index.js`.
- **Agregar comando de voz**: editar `commandMap` en `VoiceController.jsx` o `commandsConfig` en `VRVoiceController.jsx`.
- **Cambiar defaults de cámara/resolución**: `ARSConfigManager.loadConfig()` o `config_Ars.json`.
- **Nuevo modo de visualización**: crear vista en `ARSviews/` y agregar botón en `ARSExperience`.
- **Optimizar render estéreo**: tocar `ARPanel.jsx` (separación R3F/HTML, mirror mode).

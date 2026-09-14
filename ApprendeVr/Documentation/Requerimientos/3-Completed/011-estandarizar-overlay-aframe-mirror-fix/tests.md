# Requerimiento 011 — Estrategia y casos de test

## Estrategia

`ApprendeVr/frontend` no tiene todavía un runner de tests automatizados (`package.json` solo
define `dev`, `build`, `preview`, `check:i18n`; la estrategia de testing frontend está pendiente
de definir en el Requerimiento 008). Este requerimiento no depende de esa decisión: se verifica
con el mismo método que ya usa el resto de `src/views/ARs/ARScomponents/ARStest/mirror-fix/`
(validación manual en navegador, con el dev server de Vite), más dos verificaciones automatizables
que sí existen hoy en el proyecto: `vite build` (compila el nuevo entry point) y
`npm run check:i18n` (detecta texto hardcodeado/claves faltantes).

Si el Requerimiento 008 define un runner antes de que este requerimiento se implemente, agregar
acá los casos automatizados equivalentes a los manuales de abajo (import real del módulo sin
duplicación, registro del entry point en `vite.config.js`).

## Casos de test

| # | Caso | Tipo | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|---|
| 1 | Import real sin duplicación de código | Estático (revisión de código) | Revisar `aframe-overlay-modules.js`: no debe contener código copiado de `VRKaraokeAf.js`/`VRNewSongAf.js`, solo `import` del archivo real. | El diff no agrega ninguna copia del cuerpo de esos componentes. | Hecho |
| 2 | Build de producción incluye el nuevo entry, sin duplicar el módulo | Build | Correr `npm run build` en `ApprendeVr/frontend`. | Termina sin errores; `dist/` contiene el HTML generado a partir de `aframe-overlay-modules.html`; Rollup emite un chunk `VRKaraokeAf-*.js` **compartido** entre este entry y el de `A-frame/index.html` (mismo módulo, no duplicado). | Hecho — confirmado en el output del build. |
| 3 | "Karaoke" aparece en el menú de overlays de AR-SYNC | Manual (navegador) | Con `npm run dev`, abrir `artest-mirror.html` → "AR-SYNC" → menú ☰ → pestaña "Overlays". | Aparece un checkbox "Karaoke" junto a "Video local" y "Cono de palabras". | Hecho |
| 4 | Overlay muestra la lista de canciones real en ambos paneles | Manual (navegador) | Activar solo "Karaoke" (desactivar "Camera"/"Video local"). | Ambos paneles de AR-SYNC muestran la misma lista de canciones + panel "agregar canción" que `src/views/A-frame/index.html`, sin errores de consola. | Hecho |
| 5 | Rotación de cámara sincronizada entre paneles | Manual (navegador) | Con "Karaoke" activo, hacer `drag` con el mouse sobre el panel izquierdo (equivalente de escritorio al giroscopio/acelerómetro que usa `look-controls` en móvil). | El contenido del overlay rota de forma idéntica en AMBOS paneles (el puente `postMessage` relaya la rotación al panel derecho). | Hecho — confirmado visualmente: mismo desplazamiento en los dos paneles tras el drag. |
| 6 | Selección de canción sin errores | Manual (navegador) | Con "Karaoke" activo, hacer click en un ítem de la lista de canciones. | El ítem se resalta (selección); sin errores de consola. | Hecho |
| 7 | Agregar canción persiste igual que en la vista original | Manual (navegador) | Desde el overlay, abrir el panel "agregar canción", completar y guardar. Luego abrir `src/views/A-frame/index.html` en otra pestaña. | La canción agregada aparece en ambos: en `localStorage['apprendevr_canciones']` y en la lista de la vista A-Frame original. | Pendiente |
| 8 | No hay regresión en AR-TEST ni en "video"/"cone" de AR-SYNC | Manual (navegador) | Desde `artest-mirror.html`, probar "AR-TEST" y, dentro de "AR-SYNC", los overlays "Video local"/"Cono de palabras". | Todos siguen funcionando exactamente igual que antes de este requerimiento. | Hecho |
| 9 | Sin texto hardcodeado nuevo | Estático (script) | Correr `npm run check:i18n`. | `0 advertencia(s)`. | Hecho |
| 10 | Producción no tocada | Estático (revisión de código) | Revisar el diff completo del requerimiento. | Ningún archivo de `ARSExperience.jsx`, `AROverlayController.jsx`, `appArs.jsx`, `ARStereoView.jsx` ni `overlays/*.jsx` de producción aparece modificado. | Hecho |
| 11 | Refs de sincronización no quedan desincronizadas de `SYNCABLE_OVERLAYS` | Manual (navegador) | Activar el overlay "karaoke" y observar la consola al recibir el primer mensaje de sincronización. | Sin `TypeError` en `handleMessage` (`SyncStereoTestView.jsx`) — ver bug encontrado y corregido en `problems_solutions.md`. | Hecho |

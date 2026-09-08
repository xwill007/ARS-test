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
acá los casos automatizados equivalentes a los manuales de abajo (import real de los módulos sin
duplicación, registro del entry point en `vite.config.js`).

## Casos de test

| # | Caso | Tipo | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|---|
| 1 | Import real sin duplicación de código | Estático (revisión de código) | Revisar `aframe-overlay-modules.js`: no debe contener código copiado de `VRKaraokeAf.js`/`VREvaluacionAf.js`/`VRNewSongAf.js`, solo `import` de los archivos reales. | El diff no agrega ninguna copia del cuerpo de esos componentes. | Pendiente |
| 2 | Build de producción incluye el nuevo entry | Build | Correr `npm run build` en `ApprendeVr/frontend`. | Termina sin errores; `dist/` contiene el HTML generado a partir de `aframe-overlay-modules.html`. | Pendiente |
| 3 | Overlay muestra la lista de canciones real | Manual (navegador) | Con `npm run dev`, abrir `artest-mirror.html`, pulsar el nuevo botón de prueba. | Se ve la misma lista de canciones (ítems, título) que en `src/views/A-frame/index.html`, dentro del overlay. | Pendiente |
| 4 | Agregar canción persiste igual que en la vista original | Manual (navegador) | Desde el overlay, abrir el panel "agregar canción", completar y guardar. Luego abrir `src/views/A-frame/index.html` en otra pestaña. | La canción agregada aparece en ambos: en `localStorage['apprendevr_canciones']` y en la lista de la vista A-Frame original. | Pendiente |
| 5 | Panel de evaluación no rompe sin sesión | Manual (navegador) | Sin sesión activa (`localStorage['apprendevr_auth']` vacío), desde el overlay disparar "EVALUATE SONG". | El panel se abre; las llamadas a `/api/user-settings/...` fallan en silencio (no bloquean la UI), igual que en la vista original. | Pendiente |
| 6 | Panel de evaluación con sesión activa | Manual (navegador) | Con sesión activa, repetir el caso 5. | El panel de evaluación carga/guarda posición vía `/api/user-settings/...` igual que en `src/views/A-frame/index.html`. | Pendiente |
| 7 | No hay regresión en AR-TEST / AR-SYNC | Manual (navegador) | Desde `artest-mirror.html`, probar los botones existentes AR-TEST y AR-SYNC. | Ambos siguen funcionando exactamente igual que antes de este requerimiento. | Pendiente |
| 8 | Sin texto hardcodeado nuevo | Estático (script) | Correr `npm run check:i18n:hardcoded`. | No reporta alertas nuevas asociadas a los archivos de este requerimiento. | Pendiente |
| 9 | Producción no tocada | Estático (revisión de código) | Revisar el diff completo del requerimiento. | Ningún archivo de `ARSExperience.jsx`, `AROverlayController.jsx`, `appArs.jsx`, `ARStereoView.jsx` ni `overlays/*.jsx` de producción aparece modificado. | Pendiente |

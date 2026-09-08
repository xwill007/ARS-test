# Requerimiento 012 — Estrategia y casos de test

## Estrategia

Igual que el Requerimiento 011: `ApprendeVr/frontend` no tiene runner de tests automatizados
(estrategia pendiente en Requerimiento 008). Se verifica manualmente en navegador con el dev
server de Vite, más `npm run build` como verificación estática de que no se rompe la compilación.

## Casos de test

| # | Caso | Tipo | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|---|
| 1 | Cursor sigue el mouse en overlay "video" | Manual (navegador) | Abrir AR-SYNC, activar solo "Video local", mover el mouse sobre el panel. | El reticle blanco se mueve junto con el mouse en tiempo real (no queda fijo en el centro). | Pendiente |
| 2 | Cursor sigue el mouse en overlay "cono" | Manual (navegador) | Abrir AR-SYNC, activar solo "Cono de palabras", mover el mouse. | Mismo reticle visible y siguiendo el mouse. | Pendiente |
| 3 | Cursor sigue el mouse en overlay "karaoke" | Manual (navegador) | Abrir AR-SYNC, activar solo "Karaoke", mover el mouse. | Mismo reticle visible y siguiendo el mouse. | Pendiente |
| 4 | Selección de canción sigue funcionando | Manual (navegador) | Con "Karaoke" activo, hacer click en un ítem de la lista. | El ítem se resalta (selección), igual que antes de este requerimiento — el raycasting manual de `VRKaraokeAf.js` no cambió. | Pendiente |
| 5 | Pantalla completa al abrir AR-TEST | Manual (navegador) | Desde `artest-mirror.html`, pulsar "AR-TEST". | El navegador entra en pantalla completa (sin barra de direcciones). | Pendiente |
| 6 | Pantalla completa al abrir AR-SYNC | Manual (navegador) | Desde `artest-mirror.html`, pulsar "AR-SYNC". | El navegador entra en pantalla completa. | Pendiente |
| 7 | Salir de pantalla completa al cerrar | Manual (navegador) | Desde AR-TEST o AR-SYNC, cerrar la vista (botón atrás/cerrar o "← Back to home"). | El navegador vuelve al modo normal (barra de direcciones visible). | Pendiente |
| 8 | Build de producción sin errores | Build | Correr `npm run build` en `ApprendeVr/frontend`. | Termina sin errores. | Pendiente |
| 9 | Componentes reales de A-Frame no modificados | Estático (revisión de código) | Revisar el diff completo del requerimiento. | `VRKaraokeAf.js`, `VRNewSongAf.js`, `VREvaluacionAf.js` y el flujo real de producción no aparecen modificados. | Pendiente |

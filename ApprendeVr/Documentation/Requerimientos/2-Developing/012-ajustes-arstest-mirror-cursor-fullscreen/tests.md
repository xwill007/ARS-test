# Requerimiento 012 — Estrategia y casos de test

## Estrategia

Igual que el Requerimiento 011: `ApprendeVr/frontend` no tiene runner de tests automatizados
(estrategia pendiente en Requerimiento 008). Se verifica manualmente en navegador con el dev
server de Vite, más `npm run build` como verificación estática de que no se rompe la compilación.

**Nota sobre el entorno de verificación:** el navegador controlado por la extensión Claude en
Chrome (usado para validar la mayoría de estos casos) bloquea la Fullscreen API por completo
(`Permissions check failed`, confirmado independiente de este código — ver
`problems_solutions.md`). Los casos de pantalla completa quedan marcados como "Implementado, no
verificable en este entorno" en vez de "Hecho" hasta que el usuario los confirme en un navegador
normal.

## Casos de test

| # | Caso | Tipo | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|---|
| 1 | Puntero sigue el mouse en overlay "video" | Manual (navegador) | Abrir AR-SYNC, activar solo "Video local", mover el mouse sobre el panel. | El círculo blanco se mueve junto con el mouse en tiempo real (no queda fijo en el centro). | Hecho |
| 2 | Puntero sigue el mouse en overlay "cono" | Manual (navegador) | Abrir AR-SYNC, activar solo "Cono de palabras", mover el mouse. | Mismo puntero visible y siguiendo el mouse. | Hecho |
| 3 | Puntero sigue el mouse en overlay "karaoke" | Manual (navegador) | Abrir `aframe-overlay-modules.html` directo, y también dentro de AR-SYNC con "Karaoke" activo; mover el mouse. | Mismo puntero visible y siguiendo el mouse en ambos casos. | Hecho |
| 4 | Selección de canción sigue funcionando | Manual (navegador) | Con "Karaoke" activo, hacer click en un ítem de la lista. | El ítem se resalta (selección), igual que antes de este requerimiento. | Hecho |
| 5 | Sin doble puntero en "video" | Manual (navegador) | Activar "Video local", mover el mouse. | Solo se ve UN puntero (el 2D nuevo); el `<a-cursor>` original no se ve (oculto con `opacity: 0`). | Hecho |
| 6 | Pantalla completa al abrir AR-TEST | Manual (navegador real, no automatizado) | Desde `artest-mirror.html`, pulsar "AR-TEST". | El navegador entra en pantalla completa (sin barra de direcciones). | Implementado, pendiente de confirmación manual |
| 7 | Pantalla completa al abrir AR-SYNC | Manual (navegador real, no automatizado) | Desde `artest-mirror.html`, pulsar "AR-SYNC". | El navegador entra en pantalla completa. | Implementado, pendiente de confirmación manual |
| 8 | Salir de pantalla completa al cerrar | Manual (navegador real, no automatizado) | Desde AR-TEST o AR-SYNC, cerrar la vista (botón atrás/cerrar o "← Back to home"). | El navegador vuelve al modo normal (barra de direcciones visible). | Implementado, pendiente de confirmación manual |
| 9 | Build de producción sin errores | Build | Correr `npm run build` en `ApprendeVr/frontend`. | Termina sin errores. | Hecho |
| 10 | Componentes reales de A-Frame no modificados | Estático (revisión de código) | Revisar el diff completo del requerimiento. | `VRKaraokeAf.js`, `VRNewSongAf.js`, `VREvaluacionAf.js` y el flujo real de producción no aparecen modificados. | Hecho |

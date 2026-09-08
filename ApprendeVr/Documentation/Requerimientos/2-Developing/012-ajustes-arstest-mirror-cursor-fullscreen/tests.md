# Requerimiento 012 — Estrategia y casos de test

## Estrategia

Igual que el Requerimiento 011: `ApprendeVr/frontend` no tiene runner de tests automatizados
(estrategia pendiente en Requerimiento 008). Se verifica manualmente en navegador con el dev
server de Vite (estado real de componentes vía consola, no solo inspección visual), más
`npm run build`/`npm run check:i18n` como verificación estática.

**Nota sobre el entorno de verificación:** el navegador controlado por la extensión Claude en
Chrome (usado para validar la mayoría de estos casos) bloquea la Fullscreen API por completo
(`Permissions check failed`, confirmado independiente de este código) y, en un momento de la
sesión, empezó a censurar parte de la introspección por consola (falsos positivos de "cookie"/
"JWT" sobre strings inocuos como código fuente o un número de versión) — ambas son limitaciones
del entorno, no del código bajo prueba.

## Casos de test

| # | Caso | Tipo | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|---|
| 1 | Reticle estático e idéntico en ambos paneles ("video"/"cono") | Manual (navegador) | Abrir AR-SYNC con "Video local" o "Cono de palabras" activo. | El reticle aparece en el centro de cada panel, en la misma posición relativa en ambos, sin moverse con el mouse/touch. | Hecho |
| 2 | Reticle intersecta el video en reposo | Manual (navegador) + consola | Abrir AR-SYNC con "Video local" activo, sin rotar la cámara. | `cursorEl.components['raycaster'].intersectedEls.length === 1` (el video), confirmado por consola; visualmente el reticle cae dentro del rectángulo del video. | Hecho |
| 3 | Auto-click por dwell en "video" | Manual (navegador) + consola | Con el reticle sobre el video (caso 2), esperar el `cursorFuseTimeout` (2.5s) sin hacer click. | El reticle cambia a rojo y se achica progresivamente; al completar el tiempo, el video pasa a `paused: false` sin ningún click manual. | Hecho |
| 4 | Auto-click por dwell en "karaoke" | Manual (navegador) + consola | Abrir `aframe-overlay-modules.html`, apuntar (drag de cámara) al botón "EVALUATE SONG", esperar el dwell. | Log real `Evaluate song requested for: ...` de `VRKaraokeAf.js` en consola, disparado solo por el dwell — sin click manual. | Hecho |
| 5 | Un solo puntero, sin duplicados | Manual (navegador) | Activar "Karaoke" en AR-SYNC. | Se ve un único puntero (el div estático `#mirror-fix-pointer`), no coexiste con ningún otro indicador. | Hecho |
| 6 | Click manual directo sigue funcionando | Manual (navegador) | Con "Karaoke" activo, click directo (sin esperar el dwell) en un ítem de la lista de canciones. | El ítem se resalta (selección), igual que antes de este requerimiento — el raycasting manual de `VRKaraokeAf.js` no se rompió. | Hecho |
| 7 | Sync de play/pause en "video" | Manual (navegador) + consola | Reproducir/pausar el video en un panel (vía `comp.togglePlay()` por consola, para evitar depender de si un click de automatización cuenta como gesto real). | `paused` y `currentTime` se replican en el panel hermano, en ambas direcciones. | Hecho |
| 8 | Sync de play/pause en "karaoke" | Manual (navegador) + consola | Igual que el caso 7, sobre `comp._htmlVideo` de `vr-karaoke-af`. | Mismo resultado — `currentTime` con diferencia menor a 0.01s entre paneles. | Hecho |
| 9 | Sin eco en "karaoke" | Manual (navegador) + consola | Activar "Karaoke" en AR-SYNC con ambos paneles. | `video.volume` = 0.01 en el panel primario/izquierdo, 1.0 en el derecho — confirmado por consola en ambos iframes. | Hecho |
| 10 | Pantalla completa al abrir AR-TEST/AR-SYNC | Manual (navegador real, no automatizado) | Desde `artest-mirror.html`, pulsar "AR-TEST" o "AR-SYNC". | El navegador entra en pantalla completa (sin barra de direcciones). | Implementado, pendiente de confirmación manual del usuario |
| 11 | Salir de pantalla completa al cerrar | Manual (navegador real, no automatizado) | Cerrar la vista (botón atrás/cerrar o "← Back to home"). | El navegador vuelve al modo normal. | Implementado, pendiente de confirmación manual del usuario |
| 12 | Build de producción sin errores | Build | Correr `npm run build` en `ApprendeVr/frontend`. | Termina sin errores. | Hecho |
| 13 | Sin texto hardcodeado nuevo | Estático (script) | Correr `npm run check:i18n`. | `0 advertencia(s)`. | Hecho |
| 14 | Componentes reales de A-Frame no modificados | Estático (revisión de código) | Revisar el diff completo del requerimiento. | `VRKaraokeAf.js`, `VRNewSongAf.js`, `VREvaluacionAf.js` y el flujo real de producción no aparecen modificados. | Hecho |

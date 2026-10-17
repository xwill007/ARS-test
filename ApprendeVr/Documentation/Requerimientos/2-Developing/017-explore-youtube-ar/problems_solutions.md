# Problemas y soluciones — Requerimiento 017

## 2026-10-02 — Redefinición de alcance (cambio antes de empezar a implementar)

**Problema:** el 017 original definía un overlay "Explore Youtube AR" **independiente**, sin
integrarse con "New Song" (exploración/reproducción autocontenida). El usuario aclaró que lo que
quiere es otra cosa: que el botón **"BUSCAR EN YOUTUBE"** del panel "New Song" abra el overlay
pasándole el artista/canción, y que al seleccionar un resultado se reproduzca **y se rellenen los
campos URL/título/artista** del formulario.
**Causa:** el requerimiento se había redactado antes de confirmar el flujo completo con el usuario.
**Solución:** se reescribió `requerimiento.md`/`checklist.md`/`tests.md` para reflejar el nuevo
objetivo: integración "New Song" ↔ overlay (consulta por `localStorage`, selección por
`postMessage` con fan-out a ambos overlays `newSong`), y relleno de campos con la regla "URL
siempre, título/autor solo si vacíos".
**Estado:** resuelto.

## 2026-10-17 — Fallback de búsqueda con Invidious cuando falta la API key

**Problema:** sin `YOUTUBE_API_KEY`, el overlay "Explore Youtube AR" solo muestra el mensaje
"Búsqueda de YouTube no configurada (falta la API key en el backend)" y no deja ver la lista de
videos. El usuario pidió una alternativa sin key para poder ver resultados igualmente.
**Causa:** la búsqueda depende de la YouTube Data API v3, que exige key; conseguirla es el paso
previo pendiente (Fase 0 del checklist).
**Solución:** se agregó un botón "BUSCAR CON INVIDIOUS" que aparece solo cuando el backend devuelve
`NOT_CONFIGURED` (503, sin key). Al pulsarlo, el frontend consulta directamente la API pública de
Invidious — `vrYoutubeSearchApi.util.js` → `searchYoutubeInvidious()`, probando una lista corta de
instancias en orden con timeout — y muestra la misma lista de resultados normalizada al mismo
formato `{ videoId, title, thumbnailUrl, channelTitle }`. Seleccionar un resultado reproduce y
rellena "New Song" igual que la búsqueda normal (el `videoId` es el mismo de YouTube). Se eligió
cliente→Invidious (no proxy por backend) porque Invidious no requiere key ni cuota y es un fallback
puntual; queda como respaldo, NO reemplaza la Data API (instancias de terceros inestables, van
contra los ToS de YouTube y sin personalización de sesión).
**Estado:** resuelto.

## Formato de cada entrada

```
### YYYY-MM-DD — Título corto del problema

**Problema:** qué pasó.
**Causa:** por qué pasó.
**Solución:** qué se hizo.
**Estado:** resuelto / pendiente / hallazgo tardío (ver regla en el skill `crear-requerimiento`).
```

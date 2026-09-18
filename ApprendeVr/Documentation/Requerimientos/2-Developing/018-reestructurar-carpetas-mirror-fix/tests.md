# Estrategia de testing — Requerimiento 018

## Estrategia

No hay lógica nueva que testear (es una reorganización pura de archivos) — la validación es:

1. **Compilación**: `npm run build` (frontend) en verde después de cada fase del checklist,
   confirmando que las 4 entradas de `vite.config.js` generan sus `.html` sin error.
2. **Diff de contenido**: revisar con `git diff`/`git show` que cada archivo movido solo cambió
   líneas de `import`/`iframe src`, nunca lógica — la forma más simple de detectar un cambio de
   comportamiento accidental durante la reorganización.
3. **Manual en navegador**: es la única forma de detectar el riesgo real de este requerimiento (un
   `iframe src` mal recalculado, que `npm run build` no valida — ver "Diseño técnico" del
   requerimiento).

## Casos — Manual en navegador

| Caso | Resultado esperado |
|---|---|
| Abrir `artest-mirror.html` → botón "AR-SYNC" | Carga sin errores de consola |
| Con el overlay "Karaoke" activado en el menú ⚙️ → Overlays | Se ve la lista de canciones + reproductor, sin 404 en Network para `aframe-overlay-modules.html` |
| Con el overlay "Youtube Video" activado | Se ve el panel de YouTube, sin 404 en Network para `youtube-video.html` |
| Con el overlay "New Song" activado | Se ve el panel de agregar canción, sin 404 en Network para `new-song.html` |
| Activar/desactivar cualquier overlay desde el menú ⚙️ → Overlays | Se muestra/oculta correctamente, igual que antes de la reorganización |
| Abrir `artest-mirror.html` → botón "AR-TEST" | Sigue funcionando igual que antes (mecanismo de espejo por captura de píxeles, no tocado) |
| `git log --follow -- <ruta nueva de un archivo movido>` | Muestra el historial completo previo al movimiento (confirma que se usó `git mv`, no borrar+crear) |

## Casos — Build

| Caso | Resultado esperado |
|---|---|
| `npm run build` (frontend), fase 3 del checklist | Genera `.../VRKaraokeOverlaySync/aframe-overlay-modules.html` en `dist/` en la ruta nueva |
| `npm run build` (frontend), fase 4 | Genera los `.html` de "Youtube Video" y "New Song" en sus rutas nuevas |
| `npm run build` (frontend), fase 6 (final) | Compila completo sin errores, las 4 entradas de `vite.config.js` (incluida `artestMirror`, sin cambios) generan su `.html` |

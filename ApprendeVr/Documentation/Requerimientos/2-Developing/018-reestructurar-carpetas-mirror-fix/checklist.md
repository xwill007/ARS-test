# Checklist de ejecución — Requerimiento 018

Orden de hoja hacia raíz (ver "Diseño técnico" del requerimiento): cada fase termina con
`npm run build` (frontend) en verde antes de pasar a la siguiente. Usar `git mv` para cada
movimiento (preserva historial).

## Fase 1 — Crear el esqueleto de carpetas

- [x] 1.1 Crear `mirror-fix/components/` y las subcarpetas vacías de los 3 componentes de primer
      nivel (`ARTestMirrorButton/`, `TestOverlayAR2/`, `SyncStereoTestView/`).
- [x] 1.2 Crear `mirror-fix/components/SyncStereoTestView/components/` y las 7 subcarpetas vacías
      de sus hijos (`CameraOverlaySync/`, `VRLocalVideoOverlaySync/`, `VRConeOverlaySync/`,
      `SyncConfigCompassMenu/`, `VRKaraokeOverlaySync/`, `VRYoutubeVideoOverlaySync/`,
      `VRNewSongOverlaySync/`).

## Fase 2 — Mover los componentes hoja simples (sin página propia)

- [x] 2.1 `git mv` de `CameraOverlaySync.jsx`, `VRConeOverlaySync.jsx` a sus carpetas nuevas — sin
      cambios de import (no importan nada de `mirror-fix/`). Crear `index.js` barrel en cada una.
- [x] 2.2 `git mv` de `VRLocalVideoOverlaySync.jsx` y `SyncConfigCompassMenu.jsx` — corregido el
      import de `useVRLanguage` (recalculado con `python3 -c "os.path.relpath(...)"` para evitar
      errores de conteo manual, no a mano). Creado `index.js` en cada una.
- [x] 2.3 `git mv` de `TestOverlayAR2.jsx` a `mirror-fix/components/TestOverlayAR2/` — corregido el
      mismo import de `useVRLanguage`. Creado `index.js`.
- [x] 2.4 `node --check` sobre los archivos `.js` movidos hasta acá — sin errores de sintaxis (el
      build completo se corrió recién al final, ver Fase 6, en vez de en cada fase intermedia).

## Fase 3 — Mover el overlay "Karaoke" (con página propia)

- [x] 3.1 `git mv` de `VRKaraokeOverlaySync.jsx`, `aframe-overlay-modules.html` y
      `aframe-overlay-modules.js` juntos a `.../components/VRKaraokeOverlaySync/`.
- [x] 3.2 Corregido el `iframe src="./aframe-overlay-modules.html"` en `VRKaraokeOverlaySync.jsx` a
      la ruta relativa completa desde `artest-mirror.html`
      (`./components/SyncStereoTestView/components/VRKaraokeOverlaySync/aframe-overlay-modules.html`).
- [x] 3.3 Corregidos los 3 imports relativos hacia `A-frame/` dentro de `aframe-overlay-modules.js`
      (nuevo nivel de profundidad, recalculado con Python).
- [x] 3.4 Actualizada la entrada `aframeOverlayModules` en `vite.config.js` a la ruta nueva.
- [x] 3.5 Creado `index.js` barrel para `VRKaraokeOverlaySync`.
- [x] 3.6 Verificado con `npm run build` final (Fase 6): genera el `.html` en la ruta nueva sin
      error.

## Fase 4 — Mover los overlays "Youtube Video" y "New Song" (mismo patrón que Fase 3)

- [x] 4.1 `git mv` de `VRYoutubeVideoOverlaySync.jsx` + `youtube-video.html` +
      `youtube-video-modules.js` a `.../components/VRYoutubeVideoOverlaySync/`; corregidos `iframe
      src`, el import interno de `youtube-video-modules.js`, la entrada `youtubeVideo` de
      `vite.config.js`, y creado `index.js`.
- [x] 4.2 `git mv` de `VRNewSongOverlaySync.jsx` + `new-song.html` + `new-song-modules.js` a
      `.../components/VRNewSongOverlaySync/`; corregidos `iframe src`, los 2 imports internos de
      `new-song-modules.js`, la entrada `newSong` de `vite.config.js`, y creado `index.js`.
- [x] 4.3 Verificado con `npm run build` final (Fase 6): ambos `.html` se generan en sus rutas
      nuevas sin error.

## Fase 5 — Mover `SyncStereoTestView` (conecta con sus 7 hijos ya movidos)

- [x] 5.1 `git mv` de `SyncStereoTestView.jsx` a
      `mirror-fix/components/SyncStereoTestView/SyncStereoTestView.jsx`.
- [x] 5.2 Corregidos los 7 imports hacia sus hijos (`./components/<Nombre>`), los 2 imports hacia
      `A-frame/` y el import de `fullscreenHelper.js` (`../../fullscreenHelper.js`, vuelve a la
      raíz de `mirror-fix/`, que no se mueve).
- [x] 5.3 Creado `index.js` barrel.
- [x] 5.4 Verificado con `npm run build` final (Fase 6).

## Fase 6 — Mover `ARTestMirrorButton` y actualizar `artest-mirror.jsx` (raíz de la vista)

- [x] 6.1 `git mv` de `ARTestMirrorButton.jsx` a
      `mirror-fix/components/ARTestMirrorButton/ARTestMirrorButton.jsx`.
- [x] 6.2 Corregidos los imports de `ARStereoView`, `TestOverlayAR2`/`SyncStereoTestView`
      (rutas relativas nuevas, ambos ahora hermanos bajo `components/`), `fullscreenHelper.js`
      (vuelve a la raíz) y `useVRLanguage`.
- [x] 6.3 Creado `index.js` barrel.
- [x] 6.4 Actualizado el import de `ARTestMirrorButton` en `artest-mirror.jsx` (que NO se movió) a
      `./components/ARTestMirrorButton`.
- [x] 6.5 `npm run build` (frontend) en verde — build completo de la vista reorganizada. Los 4
      `.html` de `vite.config.js` se generan en `dist/` con la estructura nueva (confirmado en el
      output del build: `artest-mirror.html` en la raíz, los otros 3 anidados bajo
      `mirror-fix/components/SyncStereoTestView/components/<Overlay>/`).

## Fase 7 — Verificación final

- [x] 7.1 Verificado: `App.jsx` no necesitó ningún cambio (la URL a `artest-mirror.html` sigue
      apuntando a un archivo que no se movió — confirmado con grep).
- [x] 7.2 `git status`: todos los archivos movidos aparecen como renombrados (`R`/`RM`, nunca
      borrado+creado) — confirma que se usó `git mv` en cada caso y que el historial se preserva.
      El diff de `vite.config.js` es de solo 6 inserciones/3 eliminaciones (las 3 rutas nuevas).
- [x] 7.3 `npm run check:i18n` sigue en verde tras la reorganización.
- [ ] 7.3 **Verificación manual en navegador NO completada en esta sesión**: se intentó abrir
      `artest-mirror.html` con `claude-in-chrome`, pero el certificado HTTPS autofirmado del
      servidor de desarrollo (`vite.config.js` → `server.https`) no está confiado en ese perfil de
      Chrome — la página cargó como interstitial de error de certificado, que las herramientas de
      automatización no pueden leer ni interactuar (no es el DOM de la app, es la UI nativa del
      navegador). Es una limitación conocida y ya documentada del entorno (ver comentarios de
      `vrUserSettingsApi.util.js`/`vrSongsApi.util.js` sobre "HTTPS autofirmado no confiado"), no
      algo introducido por este requerimiento. **Pendiente que el usuario (u otra sesión con el
      certificado ya confiado) verifique manualmente**: abrir AR-SYNC, confirmar que los 3 overlays
      con página propia cargan sin 404 en Network, activar/desactivar cada overlay desde el menú
      ⚙️ → "Overlays", y abrir AR-TEST para confirmar que sigue funcionando.
- [x] 7.4 Marcados los criterios de aceptación de `requerimiento.md` que sí se pudieron verificar
      (build, diff, i18n); los que requieren navegador quedan explícitamente sin marcar.

---
name: overlay-ar-sync-aframe
description: Define cómo sumar un componente A-Frame real de src/views/A-frame como un overlay más de la vista de prueba "AR-SYNC" (src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncStereoTestView.jsx), con sincronización de giroscopio/acelerómetro entre los paneles estéreo. Usar cuando el usuario pida exponer, agregar o "hacer disponible como overlay" un componente de la vista A-Frame dentro de AR-SYNC/mirror-fix.
---

# Agregar un componente A-Frame como overlay de AR-SYNC

`src/views/ARs/ARScomponents/ARStest/mirror-fix/` es el terreno de pruebas de overlays AR de
`ARS-test` (nació del Requerimiento 002, descartado, y sigue vivo como espacio de experimentación
— ver `ApprendeVr/Documentation/Requerimientos/4-Rejected/Discarded/002-boton-ar-y-fix-espejo-overlay-estereo/`).
Dentro de esa carpeta, **"AR-SYNC"** (`SyncStereoTestView.jsx`) es la vista que muestra dos
paneles estéreo con overlays reales y sincronizados por `postMessage`, a diferencia de "AR-TEST"
(que hace espejo por captura de píxeles — otro mecanismo, no tocar acá).

## Regla central: no crear una vista o botón nuevo

Cuando se pide "usar X como overlay" en este contexto, la integración correcta es sumar una clave
nueva al registro de overlays que **AR-SYNC ya tiene** — nunca crear un botón nuevo en
`ARTestMirrorButton.jsx` ni una vista/ruta separada. `ARTestMirrorButton.jsx` solo abre "AR-TEST"
o "AR-SYNC"; qué overlays se ven **dentro** de AR-SYNC se elige en su propio menú ⚙️
(`SyncConfigMenu.jsx`, pestaña "Overlays", checkboxes de selección múltiple).

## El contrato de un overlay sincronizable

Cada overlay sincronizable de AR-SYNC (hoy: `video` → `VRLocalVideoOverlaySync.jsx`, `cone` →
`VRConeOverlaySync.jsx`) es un componente React con `React.forwardRef` que renderiza un
`<iframe>` con una escena A-Frame adentro. El `ref` expone el `<iframe>` para que
`SyncStereoTestView.jsx` pueda leer su `contentWindow` y relayar mensajes `postMessage` entre el
panel izquierdo y el derecho (nunca al que lo emitió).

Los dos overlays existentes cargan su escena vía `srcDoc` con el código del componente **copiado a
mano** como string. Ese patrón es aceptable para componentes chicos y autocontenidos, pero **no
sirve** si el componente real depende de features de Vite (`import.meta.glob`, imports encadenados
entre varios archivos) — en ese caso hay que evitar la copia (ver "Cuándo usar `src` real en vez
de `srcDoc`" abajo).

## Pasos

1. **Crear (o reusar) una página Vite real** en `mirror-fix/` que declare la escena A-Frame
   necesaria:
   - Carga `/libs/aframe.min.js` (la misma copia local que usa `src/views/A-frame/index.html`,
     **no** una versión distinta por CDN).
   - Declara las entidades `a-entity` con el/los componente(s) que se quieren exponer, con los
     mismos atributos de schema que usa `A-frame/index.html` (revisarlo antes de inventar
     valores).
   - Declara una `<a-camera>` **sin deshabilitar `look-controls`** — en A-Frame, `look-controls`
     usa `DeviceOrientationControls` (giroscopio/acelerómetro) automáticamente en móvil, y cae a
     arrastre de mouse en escritorio. Deshabilitarlo rompe el requisito de "reaccionar a
     giroscopio/acelerómetro igual que los overlays existentes".
   - Registrar este `.html` en `ApprendeVr/frontend/vite.config.js` →
     `build.rollupOptions.input`, igual que `main`/`mobile`/`aframe` — si no se registra ahí,
     el `.html` funciona en `npm run dev` pero **no se genera en `vite build`** (rompe en
     producción sin avisar).

2. **Agregar el puente de sincronización de rotación de cámara** (mismo patrón en los tres
   overlays existentes/nuevos, cámbialo solo si el overlay necesita sincronizar algo más además de
   la cámara):
   ```js
   function send(msg) {
     window.parent.postMessage(Object.assign({ source: 'ars-sync-test' }, msg), '*');
   }
   // poll de lookControls.yawObject/pitchObject.rotation cada 16ms, comparado contra el último
   // valor RECIBIDO (no el último enviado) para no reenviar en loop lo que se acaba de aplicar de
   // forma remota — ver VRLocalVideoOverlaySync.jsx o VRConeOverlaySync.jsx para el código
   // completo (incluye position, opcional).
   // Al recibir { action: 'camera-rotation', yaw, pitch }: escribir DIRECTO en
   // lookControls.yawObject.rotation.y / lookControls.pitchObject.rotation.x — un
   // setAttribute('rotation', ...) no sirve, look-controls lo pisa en el siguiente tick.
   ```
   Si el nuevo overlay carga vía `srcDoc` (ver paso 3), este puente va como `<script>` embebido en
   el `srcDoc`. Si carga vía `src` real (página propia), va como código normal en el `.js` de esa
   página — no hace falta injectarlo como string.

3. **Cuándo usar `src` real en vez de `srcDoc`.** Si el componente real es autocontenido y chico,
   se puede copiar su código dentro de un `srcDoc` (patrón de `VRLocalVideoOverlaySync.jsx`). Si
   depende de `import.meta.glob`, de imports encadenados entre varios archivos del proyecto, o de
   cualquier feature que solo funciona servida por Vite, **no copiarlo**: crear la página Vite real
   del paso 1 e importar el componente real con ES modules
   (`import '../../../../A-frame/components/<Nombre>/<Nombre>.js'` — confirmar la ruta relativa
   real, no asumirla), y montarla en el componente `forwardRef` con un `<iframe src="./tu-pagina.html">`
   **real** (nunca `srcDoc`) — necesario para que rutas relativas (`fetch`, `import.meta.glob`,
   assets) resuelvan contra el origen real de la app.

4. **Crear el componente `forwardRef`** (`<Nombre>OverlaySync.jsx`) que monta esa escena, mismo
   rol que `VRLocalVideoOverlaySync.jsx`/`VRConeOverlaySync.jsx`.

5. **Registrar la clave nueva en tres lugares** (los tres son obligatorios, olvidar cualquiera
   rompe algo distinto):
   - `SYNCABLE_OVERLAYS` en `SyncStereoTestView.jsx` (clave → componente).
   - `OVERLAY_OPTIONS` en `SyncConfigMenu.jsx` (clave → `labelKey` de i18n), para que aparezca
     como checkbox en el menú.
   - La clave de traducción nueva (`syncConfig.overlay.<clave>`) en `src/locales/{es,en,br}.json`
     (regla del skill `texto-multidioma`).

   **Gotcha ya encontrado:** `leftRefs`/`rightRefs` en `SyncStereoTestView.jsx` deben derivarse de
   `Object.keys(SYNCABLE_OVERLAYS)` (`Object.fromEntries(...)`), no de un objeto literal
   hardcodeado aparte — si el objeto de refs no incluye la clave nueva, el primer mensaje
   `postMessage` de ese overlay tira `TypeError: Cannot read properties of undefined (reading
   'current')` en `handleMessage`. Si ves ese objeto hardcodeado en vez de derivado, es una señal
   de que hay que corregirlo también.

6. **Validar en navegador**: abrir `artest-mirror.html` → "AR-SYNC" → menú ⚙️/☰ → pestaña
   "Overlays", activar la clave nueva (desactivar las demás para verla aislada), confirmar que
   renderiza sin errores de consola en ambos paneles, y que arrastrar con el mouse en un panel
   (equivalente de escritorio al giroscopio) rota el overlay igual en el panel hermano. Correr
   `npm run build` (confirma que el entry nuevo compila) y `npm run check:i18n` (confirma la clave
   de traducción).

## Referencias

- Ejemplo real de este patrón aplicado con `src` real (no `srcDoc`): overlay `karaoke` —
  `aframe-overlay-modules.html`/`.js`, `VRKaraokeOverlaySync.jsx` — ver Requerimiento 011
  (`ApprendeVr/Documentation/Requerimientos/2-Developing/011-estandarizar-overlay-aframe-mirror-fix/`).
- Ejemplos existentes con `srcDoc` (código copiado): `VRLocalVideoOverlaySync.jsx`,
  `VRConeOverlaySync.jsx`.
- No confundir con "AR-TEST" (`TestOverlayAR2.jsx`, espejo por captura de píxeles del canvas
  WebGL) — mecanismo distinto, no relacionado a este skill.

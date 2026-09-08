# Requerimiento 012 — Ajustes en ARStest mirror-fix: cursor visible y pantalla completa

## 1. Objetivo

Corregir dos problemas de usabilidad en `src/views/ARs/ARScomponents/ARStest/mirror-fix/`
(`artest-mirror.html`, overlays de prueba "AR-TEST" y "AR-SYNC"): (1) no hay un puntero/cursor
visible que siga al mouse/dedo para saber qué se está por tocar sobre los overlays A-Frame
(karaoke, cono, video), y (2) la vista no pide pantalla completa, así que la barra de direcciones
del navegador queda visible y resta espacio útil — importante en esta vista porque su caso de uso
real es sostener el celular en lentes de cartón VR, donde cada pixel de pantalla cuenta. Este es
el primer tramo de una serie de ajustes sobre esta misma vista; el usuario agregará más cambios
sobre este requerimiento una vez resueltos estos dos puntos.

## 2. Antecedentes y estado actual

### 2.1 Cursor/raycaster — estado real por overlay (verificado en código)

- **`VRLocalVideoOverlaySync.jsx`** (overlay "video" de AR-SYNC): declara un `<a-cursor
  id="main-cursor">` dentro de `<a-camera>`, condicionado a la prop `showCursor` (default `true`),
  con `raycaster="objects: .clickable, .raycastable"` — pero **sin** `cursor="rayOrigin: mouse"`.
  Sin ese atributo, el componente `cursor` de A-Frame raycastea desde el **centro de la cámara**
  (gaze), no desde la posición real del mouse: el reticle visual (`position="0 0 -1"`, chico,
  blanco) no seleccion hovers ni se percibe donde se predice hacer click, y en modo embebido de
  escritorio el click del mouse dispara el raycast desde el centro de la escena en vez de desde
  donde está el puntero — el video/controles solo reaccionan si la cámara está apuntando
  justo ahí, lo que en la práctica se percibe como "no hay cursor".
- **`VRConeOverlaySync.jsx`** (overlay "cono"): declara `<a-camera position="0 1.8 0" ...>` sin
  ningún `<a-cursor>` ni elementos `.clickable`/`.raycastable` — es un overlay puramente visual,
  no interactivo, así que hoy no hay nada que "apuntar" ahí, pero tampoco hay cursor consistente
  con los otros overlays cuando se lo activa junto a ellos.
- **`aframe-overlay-modules.html`** (overlay "karaoke", Requerimiento 011): tampoco declara
  `<a-cursor>`. `VRKaraokeAf.js`/`VRNewSongAf.js` (componentes reales de
  `src/views/A-frame/components`, ver Requerimiento 011) implementan su **propio** raycasting
  manual leyendo la posición real del mouse/touch sobre `sceneEl.canvas`
  (`vrPointerRaycast.util.js` → `getPointerNDC`), independiente de cualquier `<a-cursor>` de
  A-Frame — el click en sí **ya funciona seleccionando canciones** (confirmado en navegador
  durante el Requerimiento 011). Lo que falta es puramente el **indicador visual**: no hay ningún
  reticle ni feedback de "estás apuntando acá", solo un leve resaltado de escala al pasar el mouse
  sobre un botón.

En síntesis: el problema tiene dos causas distintas según el overlay — video tiene cursor pero mal
configurado (gaze en vez de mouse real), cono y karaoke no tienen cursor visual en absoluto (cono
porque no lo necesita hoy, karaoke porque su raycasting es manual y nunca dibujó uno).

### 2.2 Pantalla completa — no se pide en ningún lugar de `mirror-fix`

Ninguno de los archivos de `mirror-fix/` llama a `requestFullscreen()` (verificado con búsqueda en
todo el directorio). Por comparación, el flujo de producción sí lo hace:
`ApprendeVr/frontend/src/App.jsx` tiene un `enterFullscreen()` (con los prefijos
`webkitRequestFullscreen`/`mozRequestFullScreen`/`msRequestFullscreen` para compatibilidad) que se
dispara en un `useEffect` cuando `showStereoAR` se activa. `mirror-fix` no reusa esa lógica — sus
componentes son deliberadamente aislados de `App.jsx` (ver comentarios de
`ARTestMirrorButton.jsx`), así que necesita su propia llamada equivalente.

### 2.3 `mirror-fix` sigue siendo terreno de pruebas aislado

Igual que en el Requerimiento 011: `mirror-fix/` es el área de pruebas de overlays AR (originada
en el Requerimiento 002, descartado), deliberadamente separada del flujo real de producción
(`ARSExperience.jsx`, `AROverlayController.jsx`, `appArs.jsx`, `ARStereoView.jsx` de producción).
Este requerimiento sigue ese mismo principio: los ajustes van en los archivos de `mirror-fix` (y,
para el cursor de karaoke, en la página `aframe-overlay-modules.html` que monta el componente real
— nunca en `VRKaraokeAf.js`/`VRNewSongAf.js` mismos, que son código de producción reusado tal
cual, ver skill `overlay-ar-sync-aframe`).

## 3. Historias de usuario

- Como persona probando los overlays de AR-SYNC (video, cono, karaoke), quiero ver un
  puntero/cursor que siga mi mouse o mi dedo en tiempo real, para saber exactamente qué estoy por
  tocar antes de interactuar con la lista de canciones, el video u otros controles.
- Como persona usando la vista de prueba AR con el celular en lentes de cartón VR, quiero que la
  página entre en pantalla completa automáticamente al abrir "AR-TEST" o "AR-SYNC", para no perder
  espacio de pantalla con la barra de direcciones del navegador.
- Como persona que sale de la vista de prueba AR, quiero volver al modo normal del navegador (sin
  pantalla completa) al cerrarla, para seguir navegando la app con normalidad.

## 4. Alcance

### Incluido

- Agregar un cursor visible que raycastee desde la posición real del mouse/touch
  (`cursor="rayOrigin: mouse"`) de forma consistente en las tres escenas A-Frame de `mirror-fix`:
  - `VRLocalVideoOverlaySync.jsx`: corregir su `<a-cursor>` existente agregando
    `rayOrigin: mouse` (hoy raycastea desde el centro de cámara).
  - `VRConeOverlaySync.jsx`: agregar un `<a-cursor>` nuevo, mismo estilo visual que el de video,
    para que se vea consistente cuando se combina con otros overlays.
  - `aframe-overlay-modules.html` (karaoke): agregar un `<a-cursor>` nuevo en la página que monta
    el componente real (no en `VRKaraokeAf.js`/`VRNewSongAf.js`) — es puramente el indicador
    visual; el raycasting funcional de karaoke sigue siendo el manual que ya tiene.
- Pedir pantalla completa (Fullscreen API, con los mismos prefijos vendor que ya usa
  `App.jsx`) al abrir "AR-TEST" o "AR-SYNC" desde `ARTestMirrorButton.jsx`, y salir de pantalla
  completa al cerrar esa vista (botón "atrás"/cerrar).
- Extraer la lógica de entrar/salir de pantalla completa a un helper chico dentro de `mirror-fix`
  (se usa en dos lugares — AR-TEST y AR-SYNC — desde el mismo botón), en vez de duplicar los
  prefijos vendor dos veces.

### No incluido

- Tocar `VRKaraokeAf.js`, `VRNewSongAf.js`, `VREvaluacionAf.js` ni ningún componente real de
  `src/views/A-frame` — el ajuste de cursor para karaoke va en la página que lo monta
  (`aframe-overlay-modules.html`), no en el componente.
- Tocar el flujo real de producción (`App.jsx`, `ARSExperience.jsx`, `AROverlayController.jsx`,
  `appArs.jsx`, `ARStereoView.jsx` de producción) — ya tiene su propio `enterFullscreen()`, que
  queda como está.
- Agregar elementos `.clickable`/`.raycastable` nuevos al overlay "cono" — sigue siendo un overlay
  visual, solo se le agrega el cursor por consistencia visual.
- Cualquier otro ajuste de `mirror-fix` que el usuario mencionó que agregará más adelante (queda
  para una actualización posterior de este mismo requerimiento o uno nuevo, según corresponda
  cuando se defina).

## 5. Diseño técnico

### Cursor

**Opción A — agregar `cursor="rayOrigin: mouse"` a un `<a-cursor>` en cada escena (elegida).**
Es exactamente el mismo primitivo que ya usa `VRLocalVideoOverlaySync.jsx`, solo con el atributo
que le falta; replicarlo en `VRConeOverlaySync.jsx` y en `aframe-overlay-modules.html` da
consistencia visual entre los tres overlays con cero lógica nueva — A-Frame ya resuelve el
raycasting desde el mouse real con ese atributo.

**Opción B — hacer que `VRKaraokeAf.js` dibuje su propio cursor custom.** Descartada: `VRKaraokeAf.js`
es un componente real de producción (`src/views/A-frame`), reusado tal cual en `mirror-fix` desde
el Requerimiento 011 — tocarlo para una necesidad específica de esta vista de prueba rompería el
principio de "cero duplicación/modificación del componente real" que ese requerimiento estableció.
El ajuste debe vivir en la página que lo monta, no en el componente.

Elegida la Opción A. El cursor visual (`<a-cursor rayOrigin="mouse">`) es independiente del
raycasting manual que ya usa `VRKaraokeAf.js` — coexisten sin conflicto, uno es solo la
representación visual, el otro ya maneja los clicks reales de karaoke.

### Pantalla completa

Reusar el mismo patrón que `enterFullscreen()` en `App.jsx` (con los prefijos vendor
`webkitRequestFullscreen`/`mozRequestFullScreen`/`msRequestFullscreen`), pero como un helper propio
de `mirror-fix` (no importar desde `App.jsx`, para mantener el aislamiento que esta carpeta ya
tiene respecto al resto de la app) con su contraparte de salida
(`document.exitFullscreen()`/prefijos). Se invoca al abrir "AR-TEST"/"AR-SYNC" en
`ARTestMirrorButton.jsx` (los dos únicos puntos de entrada a esta vista) y se revierte al cerrar.

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/VRLocalVideoOverlaySync.jsx` | Agregar `cursor="rayOrigin: mouse"` al `<a-cursor id="main-cursor">` existente. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/VRConeOverlaySync.jsx` | Agregar un `<a-cursor>` dentro de `<a-camera>`, mismo estilo que el de video. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/aframe-overlay-modules.html` | Agregar un `<a-cursor>` dentro de `<a-camera>` (karaoke), mismo estilo. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/fullscreenHelper.js` (nuevo) | `enterFullscreen()`/`exitFullscreen()` con prefijos vendor, reusable desde `ARTestMirrorButton.jsx`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/ARTestMirrorButton.jsx` | Llamar `enterFullscreen()` al abrir "AR-TEST"/"AR-SYNC" (`setOpen('mirror'/'sync')`) y `exitFullscreen()` al cerrar (`onClose`/`goHome`). |

## 7. Criterios de aceptación

- [ ] Al pulsar "AR-TEST" o "AR-SYNC" desde `artest-mirror.html`, el navegador entra en pantalla
      completa automáticamente (sin barra de direcciones visible). Confirmado en navegador.
- [ ] Al cerrar esa vista (botón "atrás"/cerrar, o "← Back to home"), el navegador sale de
      pantalla completa. Confirmado en navegador.
- [ ] En el overlay "video" de AR-SYNC, el cursor sigue la posición real del mouse (no el centro
      de cámara) al moverlo sobre el panel. Confirmado en navegador.
- [ ] En el overlay "cono" de AR-SYNC se ve el mismo cursor visual que en "video", siguiendo el
      mouse. Confirmado en navegador.
- [ ] En el overlay "karaoke" de AR-SYNC se ve un cursor visual que sigue el mouse; seleccionar
      una canción de la lista sigue funcionando igual que antes (raycasting manual de
      `VRKaraokeAf.js`, sin cambios). Confirmado en navegador.
- [ ] No se modificó `VRKaraokeAf.js`, `VRNewSongAf.js`, `VREvaluacionAf.js` ni ningún archivo del
      flujo real de producción (`App.jsx`, `ARSExperience.jsx`, `AROverlayController.jsx`,
      `appArs.jsx`, `ARStereoView.jsx` de producción).
- [ ] `npm run build` (en `ApprendeVr/frontend`) termina sin errores.

## 8. Referencias

- Requerimiento 011: reuso de componentes A-Frame reales como overlay de AR-SYNC (karaoke) —
  `ApprendeVr/Documentation/Requerimientos/2-Developing/011-estandarizar-overlay-aframe-mirror-fix/`.
- Skill `overlay-ar-sync-aframe`: contrato de overlays sincronizables de AR-SYNC —
  `.agents/skills/overlay-ar-sync-aframe/SKILL.md`.
- Requerimiento 002 (descartado): origen de `mirror-fix` —
  `ApprendeVr/Documentation/Requerimientos/4-Rejected/Discarded/002-boton-ar-y-fix-espejo-overlay-estereo/`.
- Patrón de referencia para pantalla completa: `enterFullscreen()` en `ApprendeVr/frontend/src/App.jsx`.

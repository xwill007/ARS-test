# Requerimiento 011 — Estandarizar el reuso de componentes A-Frame como overlay en ARStest mirror-fix

## 1. Objetivo

Definir y aplicar un mecanismo estándar y repetible para que un componente A-Frame real, creado
en `src/views/A-frame` (`index.html` + `index.js`, componentes registrados con
`AFRAME.registerComponent`), se pueda **importar** — sin copiar ni reescribir su código — como un
overlay más de la vista **"AR-SYNC"** (`SyncStereoTestView.jsx`, dentro de
`src/views/ARs/ARScomponents/ARStest/mirror-fix/`), junto a los overlays "video" y "cono" que ya
existen ahí, y con el mismo soporte de giroscopio/acelerómetro que esos dos (vía `look-controls`
de A-Frame, sincronizado entre los paneles izquierdo/derecho por `postMessage`) — no como una
vista o botón nuevo separado. Hoy el patrón vigente para los overlays de AR-SYNC
(`VRLocalVideoOverlaySync.jsx`, `VRConeOverlaySync.jsx`) es pegar manualmente el código del
componente real como un string embebido en el `srcDoc` de un `<iframe>`, cargando además una
versión de A-Frame distinta (1.4.2 por CDN) de la que usa la vista original
(`/libs/aframe.min.js` local). Este requerimiento reemplaza ese patrón por uno que reutiliza el
módulo `.js` real vía `import`, y lo valida aplicándolo al módulo de lista de canciones +
reproductor (`VRKaraokeAf`, que ya arrastra **agregar canción** — `VRNewSongAf`) y, en una segunda
pasada, a **evaluación de pronunciación** (`VREvaluacionAf`) — se importa con el mismo mecanismo,
sin código nuevo de "montaje" propio: `VRKaraokeAf.js` ya la crea/actualiza dinámicamente al pulsar
"EVALUATE SONG" (ver 2.1), así que solo hacía falta el `import` para que `vr-evaluacion-af` quedara
registrado.

## 2. Antecedentes y estado actual

### 2.1 La vista A-Frame (`src/views/A-frame`)

`index.html` es una página Vite real (registrada como entry `aframe` en
`vite.config.js` → `build.rollupOptions.input`), que carga `/libs/aframe.min.js` (copia local en
`public/libs/`, no CDN) y `index.js` como `<script type="module">`. `index.js` importa los
componentes reales con ES modules:

```js
import './components/VRKaraokeAf/VRKaraokeAf.js';       // lista de canciones + reproductor
import './components/VREvaluacionAf/VREvaluacionAf.js'; // evaluación de pronunciación
```

`VRKaraokeAf.js` a su vez importa `./components/VRNewSongAf/VRNewSongAf.js` (panel de agregar
canción). `index.html` declara las entidades `<a-entity vr-karaoke-af="...">` y
`<a-entity vr-new-song-af="...">`; el panel de evaluación (`vr-evaluacion-af`) no se declara como
entidad estática — `VRKaraokeAf.js` lo crea dinámicamente al pulsar "EVALUATE SONG" (ver
Requerimiento 009).

Estos tres componentes dependen de utilidades reales de la vista, todas cargadas por Vite (no
autocontenidas en un string suelto):

- `vrSongCatalog.util.js` — catálogo de canciones agregadas, persistido en `localStorage`
  (`apprendevr_canciones`); no hay backend de canciones (ver Requerimiento 009, "No incluido").
- `vrAuth.util.js` / `vrUserSettingsApi.util.js` — sesión guardada en
  `localStorage['apprendevr_auth']` y cliente de `/api/user-settings/:view` (`fetch` con Bearer
  token) para persistir la posición de los paneles por usuario (Requerimiento 010).
- `vrPositionControl.js` — UI de ajuste/arrastre de posición de los paneles.
- `vrI18n.util.js` — traducciones vía `import.meta.glob('../../locales/*.json', { eager: true })`
  y lectura de `localStorage['apprendevr_lang']`. **Esta función solo puede ejecutarse dentro de
  un archivo procesado por Vite** (`import.meta.glob` es una feature de Vite, no de JS estándar) —
  no puede pegarse como script suelto dentro de un `srcDoc` de iframe.

### 2.2 `mirror-fix`: terreno de pruebas de un requerimiento descartado

La carpeta `src/views/ARs/ARScomponents/ARStest/mirror-fix/` nació del **Requerimiento 002**
("Confirmar botón AR... y corregir el espejo de overlays en modo estéreo"), que terminó en
`4-Rejected/Discarded` — la mayoría de sus criterios de aceptación quedaron cumplidos, pero el
caso de overlays R3F quedó sin resolver y el requerimiento no se retomó; los archivos de prueba,
que su propio checklist marcaba para "eliminar al terminar", quedaron como terreno de
experimentación reutilizable.

`artest-mirror.html` monta `artest-mirror.jsx` → `ARTestMirrorButton.jsx`, que hoy ofrece dos
mecanismos de overlay de prueba:

- **AR-TEST** (`TestOverlayAR2.jsx`): overlay mínimo (caja + texto) definido inline en un
  `srcDoc`, con captura síncrona de píxeles del canvas WebGL hacia un `<canvas id="ars-frame-capture">`
  — mecanismo de "espejo" para el panel derecho en modo estéreo. Abre `ARStereoView.jsx`
  directamente. Fuera del alcance de este requerimiento.
- **AR-SYNC** (`SyncStereoTestView.jsx`): dos instancias reales por panel, sincronizadas por
  `postMessage` en vez de espejo por captura. **No** usa `ARStereoView.jsx` — monta sus propios
  dos paneles y su propio menú (`SyncConfigMenu.jsx`, botón ⚙️/☰), con selección **múltiple** de
  qué overlays se apilan sobre cada panel: `SYNCABLE_OVERLAYS` en `SyncStereoTestView.jsx` mapea
  cada clave (`video`, `cone`) a su componente, y `OVERLAY_OPTIONS` en `SyncConfigMenu.jsx` los
  lista como checkboxes en la pestaña "Overlays" del menú. `camera` (la cámara real del
  dispositivo, de fondo) es un caso aparte que no necesita sync — cada panel lee su propio feed.
  Los dos overlays sincronizables existentes son **copias literales** (según su propio comentario)
  de componentes de producción (`VRLocalVideoOverlay.jsx`, `VRConeOverlay.jsx`), pegadas como
  string dentro de un `srcDoc`, con un puente `postMessage` agregado a mano al final de cada una
  que sincroniza entre los dos paneles tanto la rotación/posición de cámara (que en un dispositivo
  móvil viene del giroscopio/acelerómetro vía `look-controls`/`DeviceOrientationControls` de
  A-Frame) como el estado propio del overlay (play/pause/seek, voz, etc.).

**Problema concreto que resuelve este requerimiento:** el patrón de los overlays sincronizables de
AR-SYNC obliga a mantener una copia manual del código del componente sincronizada a mano con el
original (ya divergió en la versión de A-Frame usada), y no es aplicable a componentes que, como
`VRKaraokeAf`, dependen de imports encadenados entre varios archivos (o, en el caso de
`VREvaluacionAf`/`vrI18n.util.js` para una siguiente iteración, de `import.meta.glob`).

### 2.3 `artest-mirror.html` no está en el build de producción

`vite.config.js` → `build.rollupOptions.input` solo registra `main`, `mobile` y `aframe` (la vista
A-Frame). `artest-mirror.html` no aparece ahí: hoy solo funciona servido por el dev server de
Vite (que sirve cualquier `.html` del árbol), no en un `vite build` de producción. Cualquier nuevo
entry point que este requerimiento agregue en `mirror-fix` tiene el mismo problema y debe
registrarse explícitamente para no quedar "roto en build" sin que nadie lo note.

### 2.4 Sin runner de tests automatizados en frontend

`ApprendeVr/frontend/package.json` solo define `dev`, `build`, `preview` y `check:i18n` — no hay
Jest/Vitest configurado. La estrategia de testing del frontend está definida en el Requerimiento
008, todavía en `1-Pending` (sin decidir). Este requerimiento no depende de esa decisión: se
verifica con el mismo método que ya usa el resto de `mirror-fix` (validación manual en navegador),
más la comprobación de que `vite build` no rompe con el nuevo entry point.

## 3. Historias de usuario

- Como desarrollador que prueba mecanismos de overlay AR, quiero elegir "Karaoke" desde el mismo
  menú de overlays de AR-SYNC donde ya elijo "Video local" o "Cono de palabras", para validar el
  mecanismo con contenido real (lista de canciones + reproductor) sin salir del flujo de prueba
  existente.
- Como desarrollador, quiero que al girar o inclinar el dispositivo (o arrastrar con el mouse en
  escritorio) el overlay de karaoke rote igual que los overlays de video/cono, y que esa rotación
  se vea reflejada en ambos paneles del par estéreo, para confirmar que el nuevo overlay respeta
  el mismo comportamiento de giroscopio/acelerómetro que ya tienen los demás.
- Como desarrollador, quiero poder agregar una canción nueva al catálogo desde ese overlay, para
  confirmar que el formulario de agregar canción se comporta igual ahí que en la vista A-Frame
  original (misma persistencia del catálogo).
- Como desarrollador que agregue un nuevo componente A-Frame en el futuro, quiero un proceso
  documentado y repetible para sumarlo como un overlay más de AR-SYNC, para no tener que copiar
  el código a mano ni reinventar el mecanismo de sincronización cada vez.

## 4. Alcance

### Incluido

- Definir un mecanismo estándar para sumar un componente A-Frame real como un overlay más de
  AR-SYNC — importándolo con ES modules, sin copiar su código, y con sincronización de rotación de
  cámara (giroscopio/acelerómetro vía `look-controls`) entre paneles — reutilizable para cualquier
  componente de `src/views/A-frame/components`.
- Registrar en `vite.config.js` el nuevo entry point HTML que este mecanismo necesita, para que
  también compile en `vite build` (no solo en el dev server).
- Aplicar el mecanismo al módulo `VRKaraokeAf` (lista de canciones + reproductor, incluye
  `VRNewSongAf` porque `VRKaraokeAf.js` ya lo importa).
- Registrar ese overlay como una clave más (`karaoke`) en `SYNCABLE_OVERLAYS`
  (`SyncStereoTestView.jsx`) y en `OVERLAY_OPTIONS` (`SyncConfigMenu.jsx`), para que aparezca como
  checkbox seleccionable junto a "Video local" y "Cono de palabras" en el menú de overlays de
  AR-SYNC — no como una vista o botón nuevo separado.
- Sin tocar el flujo real de producción (`ARSExperience.jsx`, `AROverlayController.jsx`,
  `appArs.jsx`, `ARStereoView.jsx`) ni el mecanismo AR-TEST — mismo principio de aislamiento que ya
  sigue `mirror-fix` hoy.
- Dejar el mecanismo documentado (comentarios en el código nuevo, siguiendo el estilo ya usado en
  `mirror-fix`) como el patrón a seguir para sumar futuros componentes A-Frame a AR-SYNC.
- Todo texto visible nuevo (etiqueta del overlay en el menú) en los locales `es`/`en`/`br`,
  consumido con `t()`/`useVRLanguage()` (regla del skill `texto-multidioma`).

### No incluido

- **Interacción por gaze/fuse-click (Requerimiento 012) con los botones propios del panel de
  evaluación** (calificación 1/2/3, "EVALUATE", cerrar "X") — `VREvaluacionAf.js` hace su propio
  raycasting manual por mouse/touch (mismo patrón que `VRKaraokeAf.js`), pero a diferencia de
  `VRNewSongAf.js` no expone un array interno equivalente a `_clickableEls` para reusarlo; solo
  responde a click manual directo por ahora.
- Integrar estos overlays al flujo real de producción de `ARStereoView`/`AROverlayController` —
  eso implicaría reabrir el Requerimiento 002 (descartado), no es el objetivo de esta iteración.
- Sincronizar el estado propio del overlay de karaoke (canción seleccionada, play/pause) entre
  paneles — a diferencia de "Video local", que sí sincroniza play/pause/seek. Solo se sincroniza
  rotación de cámara (giroscopio/acelerómetro), igual que la parte de cámara de "Cono de
  palabras"; sincronizar además la interacción con la lista/reproductor queda fuera de esta
  iteración.
- Backend nuevo para canciones — el catálogo sigue en `localStorage`, conforme al alcance del
  Requerimiento 009.
- Overlays de tipo R3F (fuera de alcance también en el Requerimiento 002 original).
- Limpiar o eliminar el resto de `mirror-fix` (AR-TEST, ni los overlays "video"/"cone" de AR-SYNC).
- Definir la estrategia de testing automatizado del frontend (Requerimiento 008, aparte).

## 5. Diseño técnico

### Opciones consideradas

**Opción A — seguir el patrón actual (copiar el código a mano en un `srcDoc`).** Descartada: es
exactamente el problema que este requerimiento busca resolver. Además no es viable para
`vrI18n.util.js`, que depende de `import.meta.glob` (una feature de Vite, no ejecutable como
script suelto pegado en un `srcDoc`), y ya se demostró propensa a divergir (versión de A-Frame
1.4.2 por CDN en `mirror-fix` vs. `/libs/aframe.min.js` local en la vista real).

**Opción B — bundle standalone con Vite "lib mode".** Empaquetar los 3 componentes en un `.js`
suelto, cargable con `<script src>` desde cualquier host. Se descarta para esta iteración: agrega
un pipeline de build paralelo (nuevo target de Rollup, versionado y publicación del bundle) solo
para un caso de prueba interno — sobre-ingeniería frente al alcance actual.

**Opción C — página Vite real que importa el módulo real, integrada a `SYNCABLE_OVERLAYS` de
AR-SYNC (elegida).** Crear un nuevo entry point HTML (mismo patrón que
`src/views/A-frame/index.html`: un `.html` + su `.js` de entrada) dentro de `mirror-fix`, que:

- Carga `/libs/aframe.min.js` (la misma copia local que usa la vista A-Frame real, no una versión
  distinta por CDN).
- Importa con ES modules el archivo real del componente, sin copiarlo —
  `import '../../../../A-frame/components/VRKaraokeAf/VRKaraokeAf.js'` (que ya arrastra
  `VRNewSongAf.js`; ruta relativa confirmada desde
  `src/views/ARs/ARScomponents/ARStest/mirror-fix/`).
- Declara las entidades `<a-entity vr-karaoke-af="...">` y `<a-entity vr-new-song-af="...">`
  necesarias (mismo patrón de atributos que `A-frame/index.html`), con una `<a-camera>` que **no**
  deshabilita `look-controls` — en móvil, A-Frame lo maneja con `DeviceOrientationControls`
  (giroscopio/acelerómetro) automáticamente; en escritorio cae a arrastre con mouse. Mismo patrón
  que la `<a-camera>` de `VRLocalVideoOverlaySync.jsx`/`VRConeOverlaySync.jsx`.
- Su `.js` de entrada agrega el mismo puente de sincronización de rotación de cámara por
  `postMessage` (mensaje `{ source: 'ars-sync-test', action: 'camera-rotation', yaw, pitch }`,
  escribiendo directo en `yawObject`/`pitchObject` de `look-controls`) que usan
  `VRLocalVideoOverlaySync.jsx`/`VRConeOverlaySync.jsx` al final de su `srcDoc` — como código
  normal (no injectado en un string), porque esta página es un archivo real.
- Se registra en `vite.config.js` → `build.rollupOptions.input` para que compile en `vite build`,
  no solo en dev server (ver 2.3).

Un componente React nuevo (`VRKaraokeOverlaySync.jsx`, mismo sufijo/rol que
`VRLocalVideoOverlaySync.jsx`/`VRConeOverlaySync.jsx`) monta esa página en un `<iframe src="...">`
**real** (no `srcDoc`) con `React.forwardRef` — necesario tanto para que las rutas relativas que
usa `VRKaraokeAf` (rutas de video, eventualmente `fetch`) resuelvan contra el origen real de la
app en vez de contra el documento en blanco que implica un `srcDoc`, como para que
`SyncStereoTestView.jsx` pueda leer su `contentWindow` y relayar los mensajes de rotación al panel
hermano — mismo contrato que ya cumplen los otros dos overlays sincronizables. Se agrega como
`karaoke: VRKaraokeOverlaySync` a `SYNCABLE_OVERLAYS` y como entrada de `OVERLAY_OPTIONS`
(`SyncConfigMenu.jsx`), quedando seleccionable junto a "video"/"cone" en el menú de overlays de
AR-SYNC — **no** como una vista o botón nuevo en `ARTestMirrorButton.jsx`.

Elegida porque reusa el código real del componente con cero duplicación, respeta que
`vrI18n.util.js` (necesario para `VREvaluacionAf` en la siguiente iteración) necesita ser servido
por Vite, se integra al mecanismo de selección múltiple + sincronización de cámara que AR-SYNC ya
tiene en vez de crear uno paralelo, y deja un patrón replicable (un `.html` + `.js` de entrada por
componente, un `<Nombre>OverlaySync.jsx` que lo monta con `forwardRef`, sumado a
`SYNCABLE_OVERLAYS`/`OVERLAY_OPTIONS`) para cualquier componente A-Frame que se quiera sumar a
AR-SYNC en el futuro — sin pipeline de build nuevo.

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/aframe-overlay-modules.html` (nuevo) | Página Vite que carga `/libs/aframe.min.js`, declara las entidades A-Frame necesarias para `vr-karaoke-af` (incluye `VRNewSongAf`) y una `<a-camera>` con `look-controls` habilitado (giroscopio/acelerómetro en móvil, mouse-drag en escritorio). |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/aframe-overlay-modules.js` (nuevo) | `import` real de `VRKaraokeAf.js` y `VREvaluacionAf.js` desde `src/views/A-frame/components/...` (sin copiar código) + puente de sincronización de rotación de cámara por `postMessage` entre paneles (mismo patrón que el de `VRLocalVideoOverlaySync.jsx`/`VRConeOverlaySync.jsx`, ver Fase 5.2 del diseño técnico). |
| `ApprendeVr/frontend/vite.config.js` | Agregar el nuevo `.html` a `build.rollupOptions.input`, junto a `main`/`mobile`/`aframe`, para que compile también en `vite build`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/VRKaraokeOverlaySync.jsx` (nuevo) | Monta `aframe-overlay-modules.html` en un `<iframe src="...">` real (no `srcDoc`) con `React.forwardRef`, mismo contrato que `VRLocalVideoOverlaySync.jsx`/`VRConeOverlaySync.jsx`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncStereoTestView.jsx` | Agregar `karaoke: VRKaraokeOverlaySync` a `SYNCABLE_OVERLAYS`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncConfigMenu.jsx` | Agregar `{ key: 'karaoke', labelKey: 'syncConfig.overlay.karaoke' }` a `OVERLAY_OPTIONS`. |
| `src/locales/es.json`, `en.json`, `br.json` | Agregar la clave `syncConfig.overlay.karaoke` (regla del skill `texto-multidioma`). |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/ARTestMirrorButton.jsx` | **Sin cambios** de comportamiento — no se agrega ningún botón nuevo acá; el overlay se elige desde el menú de AR-SYNC. |

## 7. Criterios de aceptación

- [x] Existe un nuevo entry point Vite en `mirror-fix` que importa `VRKaraokeAf.js` mediante
      `import` real (ruta relativa hacia `src/views/A-frame/...`), sin ningún código de ese
      componente copiado o reescrito.
- [x] Ese entry point está registrado en `vite.config.js` → `build.rollupOptions.input` y
      `npm run build` (en `ApprendeVr/frontend`) termina sin errores relacionados a este archivo.
      Confirmado: `dist/src/views/ARs/ARScomponents/ARStest/mirror-fix/aframe-overlay-modules.html`
      se genera, y Rollup comparte el chunk `VRKaraokeAf-*.js` entre este entry y el de la vista
      A-Frame original (mismo módulo, sin duplicar código en el bundle).
- [x] "Karaoke" aparece como checkbox en la pestaña "Overlays" del menú ⚙️ de AR-SYNC
      (`SyncConfigMenu.jsx`), junto a "Video local" y "Cono de palabras". Al activarlo, ambos
      paneles de AR-SYNC muestran la lista de canciones real (mismos ítems que en
      `src/views/A-frame/index.html`) y el panel "agregar canción". Confirmado en navegador.
- [x] Al arrastrar con el mouse sobre uno de los dos paneles (equivalente de escritorio al
      giroscopio/acelerómetro que usa `look-controls` en móvil), el contenido del overlay de
      karaoke rota, y esa misma rotación se refleja en el panel hermano vía el puente
      `postMessage`. Confirmado en navegador: arrastre en el panel izquierdo desplazó el contenido
      de forma idéntica en ambos paneles.
- [x] No aparece ningún error de consola al activar/usar el overlay de karaoke dentro de AR-SYNC
      (incluida la selección de una canción de la lista). Confirmado — se encontró y corrigió un
      bug real durante la validación: `leftRefs`/`rightRefs` en `SyncStereoTestView.jsx` estaban
      hardcodeados sin la clave `karaoke`, causando un `TypeError` al recibir el primer mensaje de
      sincronización; se corrigió derivando esos refs de `SYNCABLE_OVERLAYS` (ver
      `problems_solutions.md`).
- [ ] Desde ese overlay se puede agregar una canción nueva y persiste en
      `localStorage['apprendevr_canciones']` — verificable también abriendo por separado la vista
      A-Frame original y viendo la canción agregada en su lista. **Pendiente de confirmar en
      navegador** (se confirmó que el panel se abre y renderiza; falta probar el flujo completo de
      guardado).
- [x] Los overlays existentes AR-TEST y "video"/"cone" de AR-SYNC siguen funcionando sin
      regresión — no se tocó su código, solo se agregó una clave nueva a `SYNCABLE_OVERLAYS`/
      `OVERLAY_OPTIONS`.
- [x] No se modificó ningún archivo del flujo real de producción (`ARSExperience.jsx`,
      `AROverlayController.jsx`, `appArs.jsx`, `ARStereoView.jsx`, `overlays/*.jsx` de producción).
- [x] Todo texto visible nuevo está en los locales `es`/`en`/`br` y pasa `npm run check:i18n` sin
      nuevas alertas.
- [x] `VREvaluacionAf` importado en `aframe-overlay-modules.js` — al pulsar "EVALUATE SONG" en el
      overlay "karaoke", el panel de evaluación real se crea y renderiza (`vr-evaluacion-af`
      registrado, `visible: true` confirmado por consola), con su contenido real (título/artista
      de la canción, selector de dificultad 1/2/3, botón EVALUATE, cerrar) — no solo un
      `setAttribute` sin efecto. Confirmado en navegador, sin errores de consola. La interacción
      por gaze/fuse-click con los botones propios de este panel queda fuera de esta pasada (ver
      "No incluido").

## 8. Referencias

- Requerimiento 002 (descartado): origen de `mirror-fix` y de los mecanismos AR-TEST/AR-SYNC —
  `ApprendeVr/Documentation/Requerimientos/4-Rejected/Discarded/002-boton-ar-y-fix-espejo-overlay-estereo/`.
- Requerimiento 009 (en desarrollo): módulos `VRKaraokeAf`/`VRNewSongAf`/`VREvaluacionAf` en la
  vista A-Frame —
  `ApprendeVr/Documentation/Requerimientos/2-Developing/009-vista-aframe-evaluacion-canciones/`.
- Requerimiento 010: `vrUserSettingsApi.util.js` / `vrPositionControl.js` (persistencia de
  posición por usuario) —
  `ApprendeVr/Documentation/Requerimientos/1-Pending/010-configuraciones-usuario-por-vista/`.
- Requerimiento 008 (pendiente, sin relación de dependencia): estrategia de testing frontend —
  `ApprendeVr/Documentation/Requerimientos/1-Pending/008-estrategia-testing-frontend/`.
- Convención de organización de componentes: `.agents/skills/componentes-frontend/SKILL.md`.
- Regla de textos multi-idioma: `.agents/skills/texto-multidioma/SKILL.md`.

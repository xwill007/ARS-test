# Requerimiento 018 — Reestructurar `mirror-fix/` en carpetas por vista/componente/elemento

## 1. Objetivo

Reorganizar la carpeta `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/`
(vista de prueba "AR-SYNC"/"AR-TEST") para que siga la arquitectura de componentes ya definida para
`ApprendeVr/frontend` (skill `componentes-frontend`: Atomic Design + colocation por vista — cada
vista es una carpeta, dentro una carpeta por componente, y si un componente tiene elementos
internos propios se anidan más carpetas), en vez de la carpeta plana con 19 archivos sueltos que
tiene hoy. Es un requerimiento de **reorganización pura**: mueve archivos y corrige las rutas de
import/URL que dependen de su ubicación, sin cambiar ningún comportamiento ni lógica.

## 2. Antecedentes y estado actual

- **`mirror-fix/` es hoy una carpeta 100% plana**, sin ninguna subcarpeta por componente:
  ```
  ARTestMirrorButton.jsx
  CameraOverlaySync.jsx
  SyncConfigCompassMenu.jsx        (146 KB)
  SyncStereoTestView.jsx           (65 KB)
  TestOverlayAR2.jsx
  VRConeOverlaySync.jsx
  VRKaraokeOverlaySync.jsx
  VRLocalVideoOverlaySync.jsx
  VRNewSongOverlaySync.jsx
  VRYoutubeVideoOverlaySync.jsx
  aframe-overlay-modules.html / .js
  artest-mirror.html / .jsx
  fullscreenHelper.js
  new-song.html / new-song-modules.js
  youtube-video.html / youtube-video-modules.js
  ```
  Contradice directamente el skill `componentes-frontend`, que define esta convención para
  `ApprendeVr/frontend` en general: `views/<Vista>/components/<Nombre>/<Nombre>.jsx` (+ `index.js`),
  anidando `components/<SubNombre>/` solo cuando `<SubNombre>` es exclusivo de `<Nombre>`.
- **Grafo de imports real dentro de `mirror-fix/`** (confirmado con grep, no supuesto):
  - `artest-mirror.jsx` (montado por `artest-mirror.html`, entry real de Vite) importa
    `ARTestMirrorButton`.
  - `ARTestMirrorButton.jsx` importa `ARStereoView` (fuera de `mirror-fix/`,
    `../../../ARSviews/ARStereoView`), `TestOverlayAR2`, `SyncStereoTestView` y
    `fullscreenHelper`.
  - `SyncStereoTestView.jsx` importa `CameraOverlaySync`, `VRLocalVideoOverlaySync`,
    `VRConeOverlaySync`, `VRKaraokeOverlaySync`, `VRYoutubeVideoOverlaySync`,
    `VRNewSongOverlaySync`, `SyncConfigCompassMenu`, dos utils de `A-frame/` y
    `fullscreenHelper.js`.
  - `CameraOverlaySync.jsx`, `VRConeOverlaySync.jsx`, `VRLocalVideoOverlaySync.jsx`,
    `VRKaraokeOverlaySync.jsx`, `VRYoutubeVideoOverlaySync.jsx`, `VRNewSongOverlaySync.jsx`,
    `TestOverlayAR2.jsx` y `SyncConfigCompassMenu.jsx` son hojas (no importan nada más de
    `mirror-fix/` entre sí).
  - `fullscreenHelper.js` es compartido por **dos** ramas distintas (`ARTestMirrorButton.jsx` y
    `SyncStereoTestView.jsx`), no exclusivo de ninguna.
  - Tres overlays son wrappers `<iframe src="...">` que montan una página Vite real propia
    (Requerimientos 011/015/014, skill `overlay-ar-sync-aframe`): `VRKaraokeOverlaySync.jsx` →
    `aframe-overlay-modules.html`/`.js`; `VRYoutubeVideoOverlaySync.jsx` →
    `youtube-video.html`/`.js`; `VRNewSongOverlaySync.jsx` → `new-song.html`/`.js`.
- **Puntos de acoplamiento externos a `mirror-fix/`** (confirmados con grep, ver "Diseño técnico"
  para cuáles cambian y cuáles no):
  - `ApprendeVr/frontend/src/App.jsx` (línea ~165): URL hardcodeada a
    `.../mirror-fix/artest-mirror.html`, usada en runtime.
  - `ApprendeVr/frontend/vite.config.js`: 4 entradas de `build.rollupOptions.input` apuntan a
    `.html` de `mirror-fix/` (`aframeOverlayModules`, `youtubeVideo`, `newSong`, `artestMirror`).
- **Hallazgo técnico clave (motiva el diseño de la sección 5):** los `<iframe src="./archivo.html">`
  dentro de `VRKaraokeOverlaySync.jsx`/`VRYoutubeVideoOverlaySync.jsx`/`VRNewSongOverlaySync.jsx`
  resuelven esa URL relativa al documento CARGADO en el navegador (`artest-mirror.html`), no a la
  ubicación del archivo fuente en el repo. Si el `.html` correspondiente cambia de carpeta, esa
  ruta relativa hay que recalcularla a mano — `npm run build` compila igual de "bien" con una ruta
  vieja rota (no valida `iframe src`), así que el error solo aparece en el navegador (404 en
  Network) si no se corrige.
- Fuera de `mirror-fix/`, la carpeta `ARStest/` tiene otros ~10 archivos sueltos sin relación con
  esta vista (`ARSVideoLocal.jsx`, `VRConeR3F*.jsx`, etc., del mecanismo "AR-TEST" por captura de
  píxeles y otros experimentos) — no se tocan en este requerimiento (ver "No incluido").

## 3. Historias de usuario

- Como desarrollador que necesita modificar el overlay "New Song" (o cualquier otro) de la vista
  de prueba AR-SYNC, quiero encontrar todo su código (componente + la página que monta en su
  iframe) dentro de una única carpeta con su nombre, para no tener que buscarlo disperso entre
  archivos sueltos de una carpeta con otros 18 archivos.
- Como desarrollador que agrega un overlay nuevo a AR-SYNC en el futuro, quiero que la carpeta
  siga un patrón consistente y ya establecido en el resto del frontend, para saber de antemano
  dónde crear sus archivos sin tener que inventar una convención nueva.
- Como desarrollador que revisa esta vista de prueba, quiero que la reorganización no cambie nada
  de su comportamiento visible, para poder confiar en que reorganizar el código no introdujo un
  regresión.

## 4. Alcance

### Incluido

- **Reorganización de carpetas dentro de `mirror-fix/`**, tratándola como una "vista" (skill
  `componentes-frontend`): su raíz de entrada (`artest-mirror.jsx`/`.html`) no se mueve; el resto
  se anida bajo `components/` según el grafo de imports real (ver "Diseño técnico" para el árbol
  completo y su justificación):
  - `ARTestMirrorButton/`, `TestOverlayAR2/` — componentes de primer nivel de la vista.
  - `SyncStereoTestView/` — componente de primer nivel, con sus 7 hijos exclusivos
    (`CameraOverlaySync/`, `VRLocalVideoOverlaySync/`, `VRConeOverlaySync/`,
    `SyncConfigCompassMenu/`, `VRKaraokeOverlaySync/`, `VRYoutubeVideoOverlaySync/`,
    `VRNewSongOverlaySync/`) anidados en su propio `components/`.
  - Cada carpeta de componente nuevo con `<Nombre>.jsx` + `index.js` (barrel), regla 5 del skill.
  - Los tres overlays con página propia (`VRKaraokeOverlaySync/`, `VRYoutubeVideoOverlaySync/`,
    `VRNewSongOverlaySync/`) llevan su `.html`/`.js` correspondiente colocado junto al `.jsx`
    dentro de su misma carpeta (no como una subcarpeta `components/` adicional — ver "Diseño
    técnico" para por qué).
  - `fullscreenHelper.js` se queda en la raíz de `mirror-fix/` (es compartido por dos ramas
    distintas, no exclusivo de ningún componente).
- **Corrección de todas las rutas de import relativas** afectadas por el movimiento (dentro de los
  archivos movidos, y en cualquier archivo que los importe).
- **Corrección de las 3 entradas afectadas de `vite.config.js`** (`aframeOverlayModules`,
  `youtubeVideo`, `newSong` — `artestMirror` no cambia, ver "Diseño técnico").
- **Corrección de los `iframe src="..."` de `VRKaraokeOverlaySync.jsx`/
  `VRYoutubeVideoOverlaySync.jsx`/`VRNewSongOverlaySync.jsx`** a la nueva ruta relativa desde
  `artest-mirror.html` (el hallazgo técnico de la sección 2 — es el paso más fácil de olvidar).
- **Verificación de que `App.jsx` no necesita cambios** (la URL a `artest-mirror.html` sigue
  siendo válida porque ese archivo no se mueve).

### No incluido

- **Los demás archivos sueltos de `ARStest/`** (`ARSVideoLocal.jsx`, `ARSVideoUniversal.jsx`,
  `ARSVideoYoutube.jsx`, `OrbitCameraController.jsx`, `TestHtmlOverlay.jsx`, `TestR3FOverlay.jsx`,
  `VRConeR3FOverlay.jsx`, `VRConeR3FVideoOverlay.jsx`, `VRConeR3FVideoOverlayConfigurable.jsx`,
  `VRDomoOverlay.jsx`): no forman parte de la vista `mirror-fix/`, no se tocan en este
  requerimiento — si necesitan la misma reorganización, es un requerimiento aparte.
- **Cualquier cambio de comportamiento, lógica o diseño visual** de cualquier componente movido:
  este requerimiento es solo reubicación de archivos + corrección de rutas.
- **Renombrar componentes** (más allá de ubicarlos en una carpeta con su mismo nombre): ningún
  `.jsx`/`.js`/`.html` cambia de nombre de archivo.
- **Aplanar o modificar `SyncConfigCompassMenu.jsx`/`SyncStereoTestView.jsx`** (146 KB y 65 KB
  respectivamente): aunque son archivos grandes, dividirlos en componentes más chicos es un
  refactor de código, no de carpetas — fuera de alcance acá.

## 5. Diseño técnico

**`mirror-fix/` se trata como LA vista, no dos vistas separadas (AR-TEST/AR-SYNC).** Se evaluó
tratar "AR-TEST" (`TestOverlayAR2.jsx`) y "AR-SYNC" (`SyncStereoTestView.jsx`) como dos vistas
independientes, cada una con su propia carpeta — descartado: ambas comparten una única raíz de
montaje real (`artest-mirror.jsx`/`.html`, seleccionadas por el mismo `ARTestMirrorButton.jsx`), no
hay dos entradas de Vite distintas para cada una. Partirlas en dos "vistas" separadas duplicaría
esa raíz sin necesidad.

**Árbol de carpetas final:**
```
mirror-fix/
├── artest-mirror.jsx                          (raíz de la vista — NO se mueve)
├── artest-mirror.html                         (entry de Vite — NO se mueve)
├── fullscreenHelper.js                        (compartido por 2 ramas — se queda en la raíz)
└── components/
    ├── ARTestMirrorButton/
    │   ├── ARTestMirrorButton.jsx
    │   └── index.js
    ├── TestOverlayAR2/
    │   ├── TestOverlayAR2.jsx
    │   └── index.js
    └── SyncStereoTestView/
        ├── SyncStereoTestView.jsx
        ├── index.js
        └── components/
            ├── CameraOverlaySync/{CameraOverlaySync.jsx, index.js}
            ├── VRLocalVideoOverlaySync/{VRLocalVideoOverlaySync.jsx, index.js}
            ├── VRConeOverlaySync/{VRConeOverlaySync.jsx, index.js}
            ├── SyncConfigCompassMenu/{SyncConfigCompassMenu.jsx, index.js}
            ├── VRKaraokeOverlaySync/
            │   ├── VRKaraokeOverlaySync.jsx
            │   ├── index.js
            │   ├── aframe-overlay-modules.html
            │   └── aframe-overlay-modules.js
            ├── VRYoutubeVideoOverlaySync/
            │   ├── VRYoutubeVideoOverlaySync.jsx
            │   ├── index.js
            │   ├── youtube-video.html
            │   └── youtube-video-modules.js
            └── VRNewSongOverlaySync/
                ├── VRNewSongOverlaySync.jsx
                ├── index.js
                ├── new-song.html
                └── new-song-modules.js
```

**El `.html`/`.js` de cada overlay-con-iframe va COLOCADO junto a su `.jsx`, no en una subcarpeta
`components/` más.** Se evaluó anidar un nivel extra (ej.
`VRKaraokeOverlaySync/components/AframeOverlayModules/`) — descartado: esos archivos no son
componentes React en el sentido Atomic Design del skill (son la página A-Frame que ese overlay
monta en su `<iframe>`), forzar una carpeta `components/` para ellos no aporta claridad y contradice
la regla 4 del skill ("cada carpeta es autocontenida... subcomponentes exclusivos viven juntos en
la carpeta del componente" — sin exigir que sean, en sí, otro componente).

**`artest-mirror.jsx`/`.html` NO se mueven (quedan en la raíz de `mirror-fix/`).** Es el entry real
de Vite y la URL que ya usa `App.jsx` en runtime — moverlos obligaría a actualizar esa URL
hardcodeada sin ninguna ganancia de organización (es la raíz de la vista, ya está en el nivel
correcto). Por el mismo motivo, la entrada `artestMirror` de `vite.config.js` tampoco cambia.

**Las otras 3 entradas de `vite.config.js` (`aframeOverlayModules`, `youtubeVideo`, `newSong`) SÍ
cambian**, a la nueva ruta anidada de cada `.html` (ej.
`mirror-fix/components/SyncStereoTestView/components/VRKaraokeOverlaySync/aframe-overlay-modules.html`).

**Los `iframe src="./archivo.html"` de los 3 `*OverlaySync.jsx` deben recalcularse a mano, no
alcanza con que compile.** Como se explicó en "Antecedentes", esa ruta la resuelve el navegador
relativa a `artest-mirror.html` (que no se mueve) — el nuevo valor tiene que ser la ruta relativa
completa desde `mirror-fix/` hasta el `.html` en su nueva ubicación anidada (ej.
`src="./components/SyncStereoTestView/components/VRKaraokeOverlaySync/aframe-overlay-modules.html"`),
no `src="./aframe-overlay-modules.html"` como hoy. Es el paso con más riesgo de quedar roto en
silencio (el build no lo valida) — ver criterio de aceptación dedicado.

**Ejecución en fases, de hoja hacia raíz, para poder validar con `npm run build` en cada paso
(dado el tamaño del blast radius).** Se mueven primero los componentes hoja sin dependientes
internos complejos (`CameraOverlaySync`, `VRConeOverlaySync`, `VRLocalVideoOverlaySync`,
`SyncConfigCompassMenu`, `TestOverlayAR2`), después los 3 overlays con página propia (uno por vez,
verificando su `iframe src` en el navegador), y por último `SyncStereoTestView` y
`ARTestMirrorButton` (que agregan las rutas de import hacia sus hijos ya movidos). Cada fase
termina con `npm run build` en verde antes de pasar a la siguiente.

## 6. Archivos a modificar

| Archivo/carpeta | Cambio |
|---|---|
| `mirror-fix/CameraOverlaySync.jsx` → `mirror-fix/components/SyncStereoTestView/components/CameraOverlaySync/CameraOverlaySync.jsx` | Mover; sin cambios de contenido (no tiene imports internos de `mirror-fix/`). Nuevo `index.js` barrel. |
| `mirror-fix/VRConeOverlaySync.jsx` → `.../components/VRConeOverlaySync/VRConeOverlaySync.jsx` | Mover; nuevo `index.js`. |
| `mirror-fix/VRLocalVideoOverlaySync.jsx` → `.../components/VRLocalVideoOverlaySync/VRLocalVideoOverlaySync.jsx` | Mover; corregir el import de `useVRLanguage` (un nivel más profundo); nuevo `index.js`. |
| `mirror-fix/SyncConfigCompassMenu.jsx` → `.../components/SyncConfigCompassMenu/SyncConfigCompassMenu.jsx` | Mover; corregir el import de `useVRLanguage`; nuevo `index.js`. |
| `mirror-fix/TestOverlayAR2.jsx` → `mirror-fix/components/TestOverlayAR2/TestOverlayAR2.jsx` | Mover; corregir el import de `useVRLanguage`; nuevo `index.js`. |
| `mirror-fix/VRKaraokeOverlaySync.jsx` + `aframe-overlay-modules.html`/`.js` → `.../components/VRKaraokeOverlaySync/` | Mover los 3 juntos; corregir `iframe src` en el `.jsx` y los imports relativos a `A-frame/` dentro de `aframe-overlay-modules.js`; nuevo `index.js`. |
| `mirror-fix/VRYoutubeVideoOverlaySync.jsx` + `youtube-video.html`/`youtube-video-modules.js` → `.../components/VRYoutubeVideoOverlaySync/` | Ídem anterior, para este overlay. |
| `mirror-fix/VRNewSongOverlaySync.jsx` + `new-song.html`/`new-song-modules.js` → `.../components/VRNewSongOverlaySync/` | Ídem anterior, para este overlay. |
| `mirror-fix/SyncStereoTestView.jsx` → `mirror-fix/components/SyncStereoTestView/SyncStereoTestView.jsx` | Mover; corregir los 7 imports hacia sus hijos (ahora en `./components/<Nombre>`) y los 2 imports hacia `A-frame/` (un nivel más profundo) y `fullscreenHelper.js` (dos niveles hacia la raíz); nuevo `index.js`. |
| `mirror-fix/ARTestMirrorButton.jsx` → `mirror-fix/components/ARTestMirrorButton/ARTestMirrorButton.jsx` | Mover; corregir el import de `ARStereoView` (un nivel más profundo), `TestOverlayAR2`/`SyncStereoTestView` (nuevas rutas), `fullscreenHelper.js` y `useVRLanguage`; nuevo `index.js`. |
| `mirror-fix/artest-mirror.jsx` | Sin mover; corregir el import de `ARTestMirrorButton` a su nueva ruta (`./components/ARTestMirrorButton`). |
| `ApprendeVr/frontend/vite.config.js` | Actualizar las rutas de `aframeOverlayModules`, `youtubeVideo`, `newSong` a sus nuevas ubicaciones anidadas. `artestMirror` no cambia. |
| `ApprendeVr/frontend/src/App.jsx` | Verificar (no debería requerir cambios): la URL a `artest-mirror.html` sigue siendo válida. |

## 7. Criterios de aceptación

- [x] `npm run build` (frontend) compila sin errores tras la reorganización completa, con las 4
      entradas de `vite.config.js` generando sus `.html` en las rutas nuevas esperadas (confirmado
      en el output del build: `artest-mirror.html` en la raíz, los otros 3 anidados bajo
      `mirror-fix/components/SyncStereoTestView/components/<Overlay>/`).
- [x] Ningún archivo cambió de contenido funcional — solo rutas de import/`iframe src` (verificado
      con `git status`: todos los archivos movidos aparecen como `R`/`RM`, nunca borrado+creado; el
      diff de `vite.config.js` es de 6 inserciones/3 eliminaciones, solo las rutas nuevas).
- [x] `npm run check:i18n` sigue en verde tras la reorganización.
- [ ] **Abrir AR-SYNC en el navegador (`artest-mirror.html`): NO verificado en esta sesión.** Se
      intentó con `claude-in-chrome`, pero el certificado HTTPS autofirmado del servidor de
      desarrollo no está confiado en ese perfil de Chrome (interstitial de error, no interactuable
      por automatización) — limitación conocida del entorno, no de este requerimiento. Pendiente
      que el usuario verifique: AR-SYNC carga directo al abrir la ruta (sin selector previo), los 3
      overlays con página propia cargan sin errores de consola y sin ningún 404 en Network (el
      hallazgo técnico de la sección 2/5), y "Volver" desde la brújula 3D sale a inicio.
- [x] ~~Abrir AR-TEST en el navegador~~ — **ya no aplica**: la rama "AR-TEST" fue eliminada por
      completo en la ampliación (Fase 8) — `TestOverlayAR2.jsx`/`index.js` borrados y sin otros
      usos en el repo.
- [ ] Activar/desactivar cada overlay desde el menú ⚙️ → "Overlays" de AR-SYNC sigue funcionando
      igual (sin regresión) tras la reorganización. **No verificado en esta sesión** (mismo motivo).
- [x] `git status` confirma que cada archivo movido aparece como renombrado (`R`/`RM`), nunca como
      borrado+creado — el historial queda preservado (`git log --follow` funcionaría sobre
      cualquiera de ellos).

## 8. Referencias

- Skill `componentes-frontend`: arquitectura de componentes de `ApprendeVr/frontend` (Atomic
  Design + colocation por vista) que este requerimiento aplica retroactivamente a `mirror-fix/`.
- Skill `overlay-ar-sync-aframe`: patrón de los overlays con página propia (`src` real vs.
  `srcDoc`) que este requerimiento reubica sin modificar.
- Requerimiento 011 (`2-Developing/011-estandarizar-overlay-aframe-mirror-fix`): origen del overlay
  `karaoke` con `src` real (`aframe-overlay-modules.html`/`.js`).
- Requerimiento 015 (`1-Pending/015-ingesta-canciones-youtube`): origen del overlay `youtubeVideo`.
- Requerimiento 014 (`2-Developing/014-agregar-nuevas-canciones`): origen del overlay `newSong`
  (separado de `karaoke` en esa misma sesión).

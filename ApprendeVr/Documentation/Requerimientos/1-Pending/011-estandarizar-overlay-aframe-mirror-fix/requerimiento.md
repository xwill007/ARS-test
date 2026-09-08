# Requerimiento 011 — Estandarizar el reuso de componentes A-Frame como overlay en ARStest mirror-fix

## 1. Objetivo

Definir y aplicar un mecanismo estándar y repetible para que un componente A-Frame real, creado
en `src/views/A-frame` (`index.html` + `index.js`, componentes registrados con
`AFRAME.registerComponent`), se pueda **importar** — sin copiar ni reescribir su código — como
overlay de prueba dentro de
`src/views/ARs/ARScomponents/ARStest/mirror-fix/artest-mirror.html`. Hoy el patrón vigente en esa
carpeta (`VRLocalVideoOverlaySync.jsx`) es pegar manualmente el código del componente real como un
string embebido en el `srcDoc` de un `<iframe>`, cargando además una versión de A-Frame distinta
(1.4.2 por CDN) de la que usa la vista original (`/libs/aframe.min.js` local). Este requerimiento
reemplaza ese patrón por uno que reutiliza el módulo `.js` real vía `import`, y lo valida
aplicándolo a los tres módulos ya disponibles en A-Frame: **lista de canciones + reproductor**
(`VRKaraokeAf`), **agregar canción** (`VRNewSongAf`) y **evaluación de pronunciación**
(`VREvaluacionAf`).

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
mecanismos de overlay de prueba, ninguno de los cuales importa un componente real de producción
tal cual:

- **AR-TEST** (`TestOverlayAR2.jsx`): overlay mínimo (caja + texto) definido inline en un
  `srcDoc`, con captura síncrona de píxeles del canvas WebGL hacia un `<canvas id="ars-frame-capture">`
  — mecanismo de "espejo" para el panel derecho en modo estéreo.
- **AR-SYNC** (`VRLocalVideoOverlaySync.jsx` + `SyncStereoTestView.jsx`): **copia literal** (según
  su propio comentario) del componente de producción `VRLocalVideoOverlay.jsx`, pegada como string
  de +1000 líneas dentro de un `srcDoc`, con un puente `postMessage` agregado a mano al final para
  sincronizar dos instancias reales (play/pause/seek, cámara, voz) entre dos iframes hermanos.

Ambos abren la escena de prueba a través de `ARStereoView.jsx` (`overlay`/`overlayType="html"`),
el mismo componente de producción que gestiona el modo estéreo — sin tocarlo.

**Problema concreto que resuelve este requerimiento:** el patrón AR-SYNC obliga a mantener una
copia manual del código del componente sincronizada a mano con el original (ya divergió en la
versión de A-Frame usada), y no es aplicable a componentes que, como los tres de esta iteración,
dependen de `import.meta.glob` o de imports encadenados entre varios archivos.

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

- Como desarrollador que prueba mecanismos de overlay AR, quiero ver la lista de canciones de
  karaoke real (la misma que en la vista A-Frame) dentro del panel de prueba de espejo, para
  validar el mecanismo de overlay con contenido real en vez de una caja de prueba genérica.
- Como desarrollador, quiero poder agregar una canción nueva al catálogo desde ese panel de
  overlay de prueba, para confirmar que el formulario de agregar canción se comporta igual dentro
  del overlay que en la vista A-Frame original (misma persistencia del catálogo).
- Como desarrollador, quiero ver el panel de evaluación de pronunciación como overlay en el panel
  de prueba, para validar que un módulo con llamadas a backend y persistencia de posición por
  usuario también funciona correctamente al reusarse como overlay.
- Como desarrollador que agregue un nuevo componente A-Frame en el futuro, quiero un proceso
  documentado y repetible para exponerlo como overlay de prueba en `artest-mirror.html`, para no
  tener que copiar el código a mano ni reinventar el mecanismo cada vez.

## 4. Alcance

### Incluido

- Definir un mecanismo estándar para montar como overlay un componente A-Frame real —
  importándolo con ES modules, sin copiar su código — reutilizable para cualquier componente de
  `src/views/A-frame/components`.
- Registrar en `vite.config.js` el nuevo entry point HTML de `mirror-fix` que este mecanismo
  necesita, para que también compile en `vite build` (no solo en el dev server).
- Aplicar el mecanismo a los tres módulos indicados: `VRKaraokeAf` (lista de canciones +
  reproductor, incluye `VRNewSongAf` porque `VRKaraokeAf.js` ya lo importa), y `VREvaluacionAf`
  (evaluación).
- Integrar el resultado en `artest-mirror.html` / `ARTestMirrorButton.jsx` como una tercera opción
  de prueba junto a AR-TEST y AR-SYNC, sin tocar el flujo real de producción (`ARSExperience.jsx`,
  `AROverlayController.jsx`, `appArs.jsx`) — mismo principio de aislamiento que ya sigue
  `mirror-fix` hoy.
- Dejar el mecanismo documentado (comentarios en el código nuevo, siguiendo el estilo ya usado en
  `mirror-fix`) como el patrón a seguir para futuros componentes A-Frame.
- Todo texto visible nuevo (nombre del botón, etiquetas) en los locales `es`/`en`/`br`, consumido
  con `t()`/`useVRLanguage()` (regla del skill `texto-multidioma`).

### No incluido

- Integrar estos overlays al flujo real de producción de `ARStereoView`/`AROverlayController` —
  eso implicaría reabrir el Requerimiento 002 (descartado), no es el objetivo de esta iteración.
- Resolver el espejo estereoscópico (ojo derecho) para estos tres módulos — solo se valida el
  montaje/import estándar en un panel de prueba, no la duplicación estéreo por captura de píxeles
  (ese mecanismo ya existe y se demostró por separado con AR-TEST/AR-SYNC).
- Backend nuevo para canciones — el catálogo sigue en `localStorage`, conforme al alcance del
  Requerimiento 009.
- Overlays de tipo R3F (fuera de alcance también en el Requerimiento 002 original).
- Limpiar o eliminar el resto de `mirror-fix` (AR-TEST, AR-SYNC).
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

**Opción C — página Vite real dentro de `mirror-fix` que importa los módulos reales (elegida).**
Crear un nuevo entry point HTML (mismo patrón que `src/views/A-frame/index.html`: un `.html` +
su `.js` de entrada) dentro de `mirror-fix`, que:

- Carga `/libs/aframe.min.js` (la misma copia local que usa la vista A-Frame real, no una versión
  distinta por CDN).
- Importa con ES modules los archivos reales de los tres componentes, sin copiarlos — por ejemplo
  `import '../../../../A-frame/components/VRKaraokeAf/VRKaraokeAf.js'` (que ya arrastra
  `VRNewSongAf.js`) e `import '../../../../A-frame/components/VREvaluacionAf/VREvaluacionAf.js'`
  (ruta relativa confirmada desde `src/views/ARs/ARScomponents/ARStest/mirror-fix/`).
- Declara las entidades `<a-entity vr-karaoke-af="...">` y `<a-entity vr-new-song-af="...">`
  necesarias (mismo patrón de atributos que `A-frame/index.html`).
- Se registra en `vite.config.js` → `build.rollupOptions.input` para que compile en `vite build`,
  no solo en dev server (ver 2.3).

`artest-mirror.html`/`ARTestMirrorButton.jsx` monta esa página en un `<iframe src="...">` **real**
(no `srcDoc`), a diferencia de AR-TEST/AR-SYNC — necesario para que las rutas relativas que usan
estos componentes (`fetch('/api/user-settings/...')`, rutas de video, `import.meta.glob` de
locales) resuelvan contra el origen real de la app en vez de contra el documento en blanco que
implica un `srcDoc`.

Elegida porque reusa el código real de los tres componentes con cero duplicación, respeta que
`vrI18n.util.js` necesita ser servido por Vite, y deja un patrón replicable (un `.html` + `.js` de
entrada por conjunto de componentes, importados tal cual, registrado en `vite.config.js`) para
cualquier componente A-Frame que se quiera probar como overlay en el futuro — sin pipeline de
build nuevo.

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/aframe-overlay-modules.html` (nuevo) | Página Vite que carga `/libs/aframe.min.js` y declara las entidades A-Frame necesarias para `vr-karaoke-af` (incluye `VRNewSongAf`) y `vr-evaluacion-af` (creado dinámicamente por el propio `VRKaraokeAf.js`, igual que en la vista original). |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/aframe-overlay-modules.js` (nuevo) | Script de entrada: `import` real de `VRKaraokeAf.js` y `VREvaluacionAf.js` desde `src/views/A-frame/components/...`, sin copiar código. |
| `ApprendeVr/frontend/vite.config.js` | Agregar el nuevo `.html` a `build.rollupOptions.input`, junto a `main`/`mobile`/`aframe`, para que compile también en `vite build`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/*.jsx` (componente nuevo, p. ej. `AframeModulesOverlaySync.jsx` o similar) | Monta el nuevo `.html` en un `<iframe src="...">` real (no `srcDoc`), siguiendo el mismo rol que `VRLocalVideoOverlaySync.jsx` cumple para el overlay AR-SYNC. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/ARTestMirrorButton.jsx` | Agregar un tercer botón de prueba que abre este nuevo overlay (mismo patrón que `open === 'mirror' \| 'sync'`). |
| `src/locales/es/translation.json`, `en/translation.json`, `br/translation.json` (o el archivo que corresponda según `vrI18n.util.js`/`VRLanguageContext`) | Agregar las claves de texto del nuevo botón/etiquetas (regla del skill `texto-multidioma`). |

## 7. Criterios de aceptación

- [ ] Existe un nuevo entry point Vite en `mirror-fix` que importa `VRKaraokeAf.js` y
      `VREvaluacionAf.js` mediante `import` real (rutas relativas hacia `src/views/A-frame/...`),
      sin ningún código de esos componentes copiado o reescrito.
- [ ] Ese entry point está registrado en `vite.config.js` → `build.rollupOptions.input` y
      `npm run build` (en `ApprendeVr/frontend`) termina sin errores relacionados a este archivo.
- [ ] Desde `artest-mirror.html`, un nuevo botón de prueba abre un overlay que muestra la lista de
      canciones real (mismos ítems/estilo que en `src/views/A-frame/index.html`) dentro de un
      `<iframe src="...">` con URL real (no `srcDoc`). Confirmado en navegador.
- [ ] Desde ese overlay se puede abrir el panel "agregar canción" y la canción persiste en
      `localStorage['apprendevr_canciones']` — verificable también abriendo por separado la vista
      A-Frame original y viendo la canción agregada en su lista. Confirmado en navegador.
- [ ] Desde ese overlay se puede abrir el panel de evaluación (flujo "EVALUATE SONG") y no lanza
      errores de consola por dependencias faltantes (`fetch` a `/api/user-settings/...` responde o
      falla en silencio igual que en la vista original, según haya o no sesión).
- [ ] Los overlays existentes AR-TEST y AR-SYNC de `mirror-fix` siguen funcionando sin regresión.
- [ ] No se modificó ningún archivo del flujo real de producción (`ARSExperience.jsx`,
      `AROverlayController.jsx`, `appArs.jsx`, `ARStereoView.jsx`, `overlays/*.jsx` de producción).
- [ ] Todo texto visible nuevo está en los locales `es`/`en`/`br` y pasa
      `npm run check:i18n` (o `check:i18n:hardcoded`) sin nuevas alertas.

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

# Requerimiento 013 — Migrar el menú de configuración de AR-SYNC a una brújula 3D en la vista

## 1. Objetivo

Reemplazar el menú de configuración actual de la vista de prueba "AR-SYNC"
(`SyncConfigMenu.jsx`, un panel HTML fijo en la esquina superior izquierda de la pantalla,
abierto/cerrado con el botón ☰) por un menú integrado en la propia escena 3D: un círculo en el
suelo con forma de brújula, con un pequeño triángulo que marca el norte, dividido en porciones
tipo torta con el título de cada sección de configuración (hoy: CONFIGURACIÓN, OVERLAYS). Dos
flechas en el círculo permiten rotar las porciones para ubicar la que se quiere al frente, y
apuntar con el cursor/la mirada a una porción despliega al frente del usuario el panel con las
opciones de esa sección.

## 2. Antecedentes y estado actual

### 2.1 El menú actual es 2D, fijo, ajeno a la escena 3D

`SyncConfigMenu.jsx` es un `<div>` HTML con `position: fixed; top: 16; left: 16` (líneas 21-33),
con dos pestañas (`arsConfig.tab.config` / `arsConfig.tab.overlays`, i18n ya existente) que
alternan entre:
- **Configuración**: tres sliders (separación, ancho, alto de cada panel estéreo) + botón
  guardar.
- **Overlays**: checkboxes de selección múltiple (`OVERLAY_OPTIONS`, líneas 67-72) para elegir
  qué overlays se apilan en cada panel.

Lo abre/cierra el botón ☰ (`menuButtonStyle`, `SyncStereoTestView.jsx` línea 257,
`showMenu`/`setShowMenu`, línea 111). No tiene ninguna relación con la escena 3D de los overlays:
vive por completo fuera de cualquier `<a-scene>`, superpuesto en pantalla.

### 2.2 Arquitectura de `mirror-fix`: no hay una escena 3D compartida

Cada overlay sincronizable de AR-SYNC vive **aislado en su propio `<iframe>` con su propia
`<a-scene>`** — no existe una escena 3D única compartida entre overlays ni entre los dos paneles
estéreo. `SyncStereoTestView.jsx` apila (`layerStyle`, `position: absolute`, línea 62) los
overlays seleccionados (`selectedOverlays`) dentro de cada panel; la única sincronización entre
iframes es por `postMessage` (rotación/posición de cámara, play/pause de video), nunca DOM o
escena compartida.

Dos formas de montar un overlay, según si depende de contenido generado en JS o de rutas
servidas por Vite:
- **`srcDoc`** (HTML embebido como string): `VRConeOverlaySync.jsx` (líneas 357-543) y
  `VRLocalVideoOverlaySync.jsx`. Cargan A-Frame por CDN dentro del propio documento embebido.
- **`src=` real** (página Vite propia): `VRKaraokeOverlaySync.jsx` monta
  `aframe-overlay-modules.html`, que carga `/libs/aframe.min.js` (misma copia local que
  producción) e importa componentes reales de `src/views/A-frame/components` — necesario porque
  esos componentes dependen de `fetch`/`import.meta.glob` que no resuelven dentro de un `srcDoc`
  en blanco.

Esto importa para este requerimiento: como no hay "el suelo de la escena" único, el nuevo menú se
implementa como una **capa nueva, propia, siempre activa** (no una porción de un overlay
existente) — ver Diseño técnico.

### 2.3 Ya existe un mecanismo propio de gaze/dwell/click (Requerimiento 012)

En `VRConeOverlaySync.jsx` (líneas 370-454) y `VRLocalVideoOverlaySync.jsx` hay un `<a-cursor
raycaster="objects: .clickable, .raycastable; ...">` dentro de `<a-camera>`, pero **no** se apoya
en el pipeline nativo de eventos de A-Frame (`fusing`/`click`) — según el propio comentario en el
código, ese pipeline nunca llegó a dispararse en este contexto (A-Frame 1.4.2), pese a que el
`raycaster` sí detecta la intersección correctamente. En su lugar hay un script propio que:
- lee `cursorEl.components['raycaster'].intersectedEls[0]` cada 50ms,
- cuenta un dwell de `FUSE_MS` (prop `cursorFuseTimeout`, default 2500ms) mientras el objetivo no
  cambia, poniendo el reticle en rojo y achicándolo progresivamente,
- al completar el dwell, dispara `target.dispatchEvent(new Event('click', {bubbles:true}))`,
- y aplica un `COOLDOWN_MS = 600` con `lastActivationAt` para no re-disparar en loop.

`aframe-overlay-modules.js` (overlay "karaoke") tiene la misma idea pero con raycasting THREE.js
manual (sin `<a-cursor>`, porque esos botones no son `.clickable`/`.raycastable`). El commit
`dea919b` ("fix: group gaze-click targets by element and add activation debounce") corrigió ahí
un bug real: el hover/lock se indexaba por **mesh** individual en vez de por **elemento** lógico,
así que un mismo botón con varios sub-meshes podía leerse como "cambió de objetivo" entre ticks y
re-disparar el click — se agrupó por elemento y se agregó el cooldown como red adicional.

Este mecanismo (`.clickable` + `<a-cursor>` + script de dwell propio, agrupado por elemento, con
cooldown) es el que este requerimiento reutiliza para las flechas y las porciones de la brújula —
no se reintenta el pipeline nativo de A-Frame, cuya causa raíz de no disparar sigue sin
diagnosticarse (fuera de alcance también en el Requerimiento 012).

### 2.4 Precedente de widgets 3D clickeables: `vrPositionControl.js`

`src/views/A-frame/vrPositionControl.js` (Requerimiento 010, vista de producción A-Frame, no
`mirror-fix`) ya construye widgets 3D reales con este patrón:
- Botones `<a-plane class="clickable">` con `<a-text>` hijo (`makeButton`, líneas 98-117),
  agrupados en un `<a-entity>` "front" desplazado hacia la cámara para quedar siempre a la misma
  distancia del usuario (líneas 78-83).
- Un único listener `pointerdown` compartido (`setupSharedRaycast`, líneas 213-244) que
  raycastea contra todos los `clickables` registrados, en vez de un handler por widget.
- Proyección de un punto 3D a coordenadas de pantalla (`worldToScreen`, líneas 248-259) para
  posicionar un `<input>` HTML anclado a la posición de un `<a-entity>` de la escena
  (`startNumericInputProjection`, líneas 261-279) — precedente directo de "mostrar un panel HTML
  en pantalla, anclado a algo que pasa en la escena 3D".

No existe en el repo ningún control 3D tipo slider/checkbox arrastrable (solo botones de
incremento fijo, como las flechas `^`/`v`/`</>`/`+`/`-` de ese mismo archivo) — se documenta como
precedente real de lo que sí existe, para no inventar capacidades que no están probadas.

### 2.5 No existe ningún patrón de brújula/menú radial previo

Búsqueda en todo `frontend/src` de "compass", "brújula", "radial-menu", "north": sin resultados
reales (solo falsos positivos de la palabra "compasión"/"compassion" en listas de vocabulario de
`VRConeOverlaySync.jsx`/`VRConeOverlay.jsx`/`VRDomo.jsx`). Este es un componente nuevo, sin
precedente directo en el proyecto más allá de los patrones de las secciones 2.3 y 2.4.

### 2.6 Alcance confirmado: solo afecta "AR-SYNC", no "AR-TEST"

`artest-mirror.html`/`artest-mirror.jsx` es el punto de entrada común de `mirror-fix`, pero monta
dos vistas distintas vía `ARTestMirrorButton.jsx`: "AR-TEST" (`TestOverlayAR2.jsx`, espejo por
captura de píxeles) y "AR-SYNC" (`SyncStereoTestView.jsx`, sincronización por estado).
`TestOverlayAR2.jsx` no importa `SyncConfigMenu` en ningún lado (confirmado en código) — el menú
de configuración que este requerimiento migra solo existe hoy en "AR-SYNC".

## 3. Historias de usuario

- Como persona usando AR-SYNC con el celular en lentes de cartón VR, quiero ver un círculo en el
  suelo con forma de brújula y un pequeño triángulo que marca el norte, para tener un punto de
  referencia visual fijo del menú de configuración dentro de la propia escena 3D.
- Como persona usando AR-SYNC, quiero ver las secciones de configuración (Configuración,
  Overlays) distribuidas como porciones de una torta alrededor del círculo, para identificar de
  un vistazo qué opciones existen sin abrir nada todavía.
- Como persona usando AR-SYNC, quiero girar las porciones del círculo con dos flechas hasta
  ubicar la que me interesa junto al norte, para seleccionarla más fácilmente en vez de tener que
  apuntar con precisión a una porción angosta.
- Como persona usando AR-SYNC, quiero que al apuntar sostenidamente con el cursor o la mirada a
  una porción se despliegue al frente mío un panel con las opciones de esa sección, para ajustar
  la configuración sin usar las manos y sin salir de la vista 3D.
- Como persona usando AR-SYNC, quiero seguir pudiendo ajustar separación/ancho/alto de los
  paneles y elegir qué overlays se muestran (con selección múltiple) igual que hoy, y guardar esos
  cambios, para no perder ninguna función al pasar del menú fijo actual al nuevo menú 3D.
- Como persona usando AR-SYNC, quiero que el botón ☰ y el panel fijo de la esquina desaparezcan
  una vez migrado el menú, para no tener dos formas distintas de llegar a la misma configuración.

## 4. Alcance

### Incluido

- Nuevo componente 3D tipo "brújula" en la escena de AR-SYNC: círculo en el suelo con un pequeño
  triángulo fijo que marca el norte (punto de referencia/frente de la brújula, no orientación
  geomagnética real), dividido en tantas porciones tipo torta como secciones existan hoy en
  `SyncConfigMenu.jsx` (2: Configuración, Overlays), cada una rotulada con `<a-text>` reusando las
  mismas claves de i18n ya existentes (`arsConfig.tab.config`, `arsConfig.tab.overlays`).
- Dos flechas (`.clickable`, mismo patrón de botón que `makeButton` de `vrPositionControl.js`) que
  rotan el grupo de porciones un paso de `360°/N secciones` por activación, en cada sentido, para
  ubicar la porción deseada junto al triángulo de norte.
- Interacción sobre flechas y porciones por click directo **y** por apuntado sostenido
  (gaze/dwell), reutilizando tal cual el mecanismo ya establecido en el Requerimiento 012
  (`.clickable` + `<a-cursor raycaster>` + script propio de hover/dwell/click con
  `FUSE_MS`/`COOLDOWN_MS`, agrupado por elemento lógico como corrigió el commit `dea919b`) — no se
  reintenta el pipeline nativo `cursor`/`fusing` de A-Frame.
- Al activar una porción (dwell completo o click directo), mostrar al frente del usuario el panel
  con las opciones de esa sección — se reutiliza el contenido/lógica ya existente de
  `SyncConfigMenu.jsx` (sliders de separación/ancho/alto, checkboxes múltiples de overlays,
  botones de guardar con su estado guardado/no guardado, indicador de sesión/dispositivo), sin
  reescribir esos controles como widgets 3D. **Corregido tras la primera pasada (ver sección 9):**
  "al frente" significa centrado DENTRO de cada panel estéreo (una instancia del panel por ojo),
  no un único overlay centrado en toda la ventana — en AR-SYNC el usuario mira a través de lentes
  de cartón VR, así que una UI que solo ocupe el centro de la ventana completa se vería partida o
  invisible por uno de los dos ojos.
- El panel se oculta cuando se deja de apuntar/seleccionar esa porción (o con su botón ✕
  existente).
- Quitar el botón ☰ y el estado `showMenu` de `SyncStereoTestView.jsx` — la brújula 3D pasa a ser
  la única forma de abrir el menú.
- La brújula se monta como una capa siempre activa (no depende de `selectedOverlays`) en **ambos**
  paneles estéreo (izquierdo y derecho) de AR-SYNC, con el mismo patrón de apilado (`layerStyle`)
  que ya usa `SyncStereoTestView.jsx` para los demás overlays.
- Se apoya en el puente de sincronización de cámara por `postMessage` que ya existe en cada
  overlay (rotación/posición) para que la brújula se vea consistente entre ambos paneles — no
  requiere un puente nuevo.

### No incluido

- Orientación geomagnética real (magnetómetro/brújula del dispositivo): el "norte" es un punto de
  referencia fijo dentro de la propia escena (el triángulo no rota; lo que rota es el grupo de
  porciones), no el norte real del mundo físico.
- Migrar el menú ⚙️ de producción (`ARSConfig.jsx`, `OverlayDropdownMenu.jsx`,
  `OverlayRegistry.js`/`overlays/index.js`) ni ningún flujo fuera de `mirror-fix` — mismo alcance
  acotado que los Requerimientos 002/011/012.
- Tocar `TestOverlayAR2.jsx` ("AR-TEST", espejo por captura) — confirmado que no usa
  `SyncConfigMenu.jsx` hoy, y sigue sin usarlo.
- ~~Construir controles 3D nuevos tipo slider o checkbox arrastrable en A-Frame~~ —
  **superado, pedido explícitamente por el usuario tras la primera pasada** ("el panel que se
  despliega debe ser un elemento 3D no 2D, debe poder interactuar con el cursor del raycaster").
  Pendiente de implementar — ver `problems_solutions.md`, entrada "Pedido explícito: el panel de
  sección debe ser 3D interactivo".
- ~~Agregar, quitar o renombrar secciones de configuración~~ — **superado**: el usuario pidió
  sumar "Volver" y "Cerrar sesión" como porciones nuevas (ver sección 7, "Criterios de la
  ampliación", y `problems_solutions.md`).
- Diagnosticar la causa raíz de por qué el pipeline nativo `cursor`/`fusing`/`click` de A-Frame no
  dispara en este contexto (ya fuera de alcance en el Requerimiento 012); se sigue usando el
  mecanismo propio ya construido y probado.
- Persistir la posición angular de la brújula (qué porción quedó "al frente") entre sesiones —
  arranca siempre en la misma orientación por defecto.

## 5. Diseño técnico

### Opciones consideradas

1. **Menú 3D completo con controles nativos A-Frame** (sliders y checkboxes 3D construidos desde
   cero: barras arrastrables, cajas toggle). Descartada: no hay precedente de slider/checkbox 3D
   arrastrable en el repo (solo botones de incremento fijo en `vrPositionControl.js`); alto
   esfuerzo/riesgo para un componente de prueba (`mirror-fix` sigue siendo terreno de pruebas
   aislado, ver skill `overlay-ar-sync-aframe`), y duplicaría lógica de guardado
   (`getUserSetting`/`saveUserSetting`) que ya funciona en `SyncConfigMenu.jsx`.
2. **Brújula 3D solo como selector visual**, que al activar una porción simplemente vuelve a
   mostrar el panel 2D actual tal cual, en su posición fija actual (esquina superior izquierda).
   Descartada: no cumple lo pedido explícitamente ("se despliega un panel al frente del
   usuario").
3. **(Elegida) Brújula 3D real** (círculo + porciones + triángulo de norte + flechas) construida
   como una nueva capa A-Frame en cada panel de AR-SYNC, con interacción por gaze/dwell y click
   directo reutilizando el mecanismo ya establecido en el Requerimiento 012; al activar una
   porción, el panel de esa sección (contenido HTML/React ya existente en `SyncConfigMenu.jsx`,
   sin reescribir sliders/checkboxes) se muestra reposicionado al centro/frente de la pantalla en
   vez de la esquina, y se oculta al dejar de apuntarla. Es la opción que cumple el pedido visual
   completo (brújula real en la escena 3D) sin reinventar controles de formulario que ya
   funcionan y sin descartar el trabajo de persistencia ya hecho.

### Estructura de la brújula

- **Triángulo de norte**: entidad fija (no rota), marca el punto de referencia/frente de la
  brújula — p. ej. alineado con -Z, la dirección en la que arranca la cámara de cada overlay
  (mismo eje que usan `VRConeOverlaySync.jsx`/`VRLocalVideoOverlaySync.jsx`).
- **Grupo de porciones**: un `<a-entity>` hijo, rotable en Y, que contiene las N porciones tipo
  torta (geometría simple, p. ej. `<a-cylinder>` con `theta-length`/`theta-start` por porción, o
  planos curvos aproximados) más su `<a-text>` de título.
- **Flechas**: dos entidades `.clickable` en el borde del círculo (mismo patrón `makeButton` que
  `vrPositionControl.js`) que rotan el grupo de porciones `360°/N` grados por activación, en
  sentidos opuestos.
- **Panel de sección**: no es una entidad 3D — sigue siendo el markup HTML/React de
  `SyncConfigMenu.jsx` (sliders/checkboxes/botones existentes), pero reposicionado a centro de
  pantalla y mostrado/ocultado según qué porción está activa, en vez de por el botón ☰.

### Dónde vive: capa nueva, no un overlay seleccionable

Dado que cada overlay de `mirror-fix` vive en su propio `<iframe>`/`<a-scene>` aislado (no hay
escena 3D compartida entre overlays ni entre paneles — ver Antecedentes 2.2), la brújula se
implementa como una capa A-Frame nueva y propia, siguiendo el mismo patrón `srcDoc` que
`VRConeOverlaySync.jsx` (`<a-scene embedded vr-mode-ui="enabled: false">`, fondo transparente),
montada **siempre** (no condicionada a `selectedOverlays`, y sin pasar por los registros
`SYNCABLE_OVERLAYS`/`OVERLAY_OPTIONS` — no es un overlay de contenido seleccionable, es la propia
UI de configuración) encima del stack existente en cada panel de `SyncStereoTestView.jsx`.

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncConfigCompassMenu.jsx` (nuevo) | Componente `forwardRef` con `<iframe srcDoc>`: escena A-Frame con la brújula (4 porciones, triángulo de norte, flechas `.clickable`), widget de posición, y **`#settings-panel`** — el panel de la sección activa como geometría A-Frame real (steppers/toggles/botones `.clickable`), hijo de `#compass-root`, no de `<a-camera>` (ver "Estado final" abajo y `problems_solutions.md`). |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncStereoTestView.jsx` | Quitar `menuButtonStyle`/botón ☰, el estado `showMenu` y (más tarde) `activeSection`; montar `SyncConfigCompassMenu` como capa siempre activa (`layerStyle`) en cada panel; puente bidireccional de mensajes (`compass-config-state` ↔ `compass-update-*`/`compass-toggle-overlay`/`compass-save-*`) — esta vista sigue siendo la dueña de `getUserSetting`/`saveUserSetting`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncConfigMenu.jsx` | **Estado final: eliminado.** La decisión intermedia (dejarlo como componente 2D controlado por props) quedó superada por el pedido explícito del usuario de que el panel fuera 3D interactivo — una vez `#settings-panel` reemplazó su contenido, `SyncConfigMenu.jsx` quedó sin ningún consumidor y se borró (`OVERLAY_OPTIONS` se duplicó, con etiquetas cortas nuevas, directamente en `SyncConfigCompassMenu.jsx`). |
| `vite.config.js` (no estaba en el alcance original — hallazgo durante la implementación) | Se agregó `artestMirror` a `build.rollupOptions.input`: sin esa entrada, `npm run build` nunca transformaba `artest-mirror.jsx`/`SyncStereoTestView.jsx`/`SyncConfigCompassMenu.jsx`, así que ese criterio de aceptación nunca fue una verificación real para este código. Ver `problems_solutions.md`. |
| `src/views/ARs/ARScomponents/ARStest/mirror-fix/ARTestMirrorButton.jsx` (ampliación, sección 9) | Ocultar el botón "← Volver a inicio" mientras AR-SYNC está abierto (`open !== 'sync'`) — la porción "Cerrar sesión" de la brújula lo reemplaza ahí. |
| `src/locales/{es,en,br}.json` (ampliación, sección 9) | Nueva clave `home.logout` ("Cerrar sesión"/"Logout"/"Sair") para la porción "Cerrar sesión". Las etiquetas de las otras 3 porciones ya existían (`arsConfig.tab.config`, `arsConfig.tab.overlays`, `home.back`). |

## 7. Criterios de aceptación

- [x] Al abrir AR-SYNC (`artest-mirror.html` → AR-SYNC) ya no aparecen el botón ☰ ni el panel fijo
      de la esquina superior izquierda; en su lugar se ve, en el suelo de cada panel estéreo, un
      círculo tipo brújula con un pequeño triángulo que marca el norte. Confirmado en navegador.
- [x] El círculo está dividido en 2 porciones tipo torta, rotuladas "Configuration"/"Overlays"
      (mismos textos, vía i18n, que hoy usan las pestañas de `SyncConfigMenu.jsx`). Confirmado.
- [ ] Dos flechas visibles en el círculo rotan el grupo de porciones (por clic directo y también
      por apuntado sostenido/dwell) hasta ubicar cualquiera de las dos secciones junto al
      triángulo de norte. **Las flechas están y son clickeables; la rotación calcula y aplica
      correctamente (confirmado forzando el tick de render manualmente), pero no se pudo ver la
      animación disparada por una interacción real en el entorno de automatización usado — ver
      `problems_solutions.md`. Pendiente de confirmación manual.**
- [x] Apuntar con el cursor/la mirada sostenidamente a una porción (dwell, mismo mecanismo que ya
      usan "cono"/"video") despliega al frente del usuario (centro de pantalla) el panel con las
      opciones de esa sección. Confirmado en navegador de punta a punta. El cierre automático al
      dejar de apuntar está implementado pero no se pudo ejercitar en este entorno (mismo motivo).
- [ ] El click directo (sin esperar el dwell) sobre una porción o una flecha también funciona,
      igual que en el resto de `mirror-fix`. **Implementado con el mismo patrón ya usado en
      video/cono (un único listener `click` en el elemento, disparado tanto por el `cursor`
      nativo de A-Frame en un click real como por el dwell manual) — no se pudo aislar y confirmar
      el camino del click real en este entorno automatizado. Pendiente de confirmación manual.**
- [x] El panel de "Configuración" sigue permitiendo ajustar separación/ancho/alto (sliders
      responden); no se confirmó el guardado con sesión real en esta pasada (sin sesión en el
      navegador de prueba, comportamiento "Sin sesión" correcto).
- [x] El panel de "Overlays" sigue permitiendo seleccionar múltiples overlays (checkboxes),
      mismas 4 opciones que antes. No se confirmó el guardado con sesión real.
- [x] La brújula se ve y responde igual en ambos paneles (izquierdo/derecho) de AR-SYNC.
      Confirmado.
- [x] No se modificó `TestOverlayAR2.jsx` ("AR-TEST") ni ningún archivo de producción fuera de
      `mirror-fix` (`vite.config.js` es la única excepción, ver "Archivos a modificar" — hallazgo
      documentado, no un archivo de producción de otra vista).
- [x] `npm run build` y `npm run check:i18n` (en `ApprendeVr/frontend`) terminan sin errores.

### Criterios de la ampliación (sección 9)

- [x] La brújula tiene 4 porciones: "Configuración", "Overlays" (abren panel), "Volver" y "Cerrar
      sesión" (acciones inmediatas). Confirmado visualmente y por interacción (click directo en
      ambas, ver `problems_solutions.md`).
- [x] "Volver" cierra AR-SYNC (vuelve al selector AR-TEST/AR-SYNC) — mismo efecto que tenía el
      botón "Volver" quitado. Confirmado.
- [x] "Cerrar sesión" borra `apprendevr_auth` de `localStorage` y navega a `/`. Confirmado
      (verificado seteando una credencial falsa, activando la porción, y comprobando que
      `localStorage.getItem('apprendevr_auth')` da `null` después).
- [x] El botón "← Volver a inicio" no aparece mientras AR-SYNC está abierto (lo reemplaza "Cerrar
      sesión"); sigue apareciendo en el selector y en AR-TEST. Confirmado.
- [x] "Cerrar sesión" NO se activa por apuntado sostenido (dwell) — solo por click directo real
      (ver hallazgo en `problems_solutions.md`: el dwell podía dispararla sin que el usuario lo
      pidiera). El resto de porciones sigue respondiendo a dwell.
- [x] Existe un widget de posición (marcador 📍 + d-pad) en la brújula que mueve `#compass-root`
      con botones de click directo, muestra las coordenadas actuales, y un botón para guardar la
      posición. Confirmado visualmente y por interacción (movido y verificado el cambio de
      posición).
- [x] La posición guardada persiste vía `getUserSetting`/`saveUserSetting`
      (`ars-sync-compass-position`) y se aplica al volver a abrir AR-SYNC. Implementado
      (`compass-ready`/`compass-set-position`/`compass-save-position`); no se confirmó con sesión
      real (sin sesión en el navegador de prueba).
- [x] El panel de la sección activa (Configuración/Overlays) se ve DUPLICADO — una instancia por
      cada panel estéreo (izquierdo y derecho), no un único overlay para toda la ventana. Confirmado
      visualmente (título/sesión/campos/checks idénticos en ambos iframes de la brújula).
- [x] El widget de posición (marcador + d-pad) es visible y funciona igual en ambos paneles
      estéreo. Confirmado (misma estructura y posición inicial en ambos iframes de la brújula).
- [x] La rotación de cámara de la brújula no desalinea el video/cono entre paneles (regresión
      encontrada y revertida, ver `problems_solutions.md`). Confirmado: video y brújula a la misma
      altura en ambos paneles tras el fix.
- [x] **(Pedido explícito, sección 9)** El panel de la sección activa es geometría A-Frame real
      dentro de la escena — no HTML 2D — interactuable con el mismo raycaster/`.clickable` que el
      resto de la brújula (steppers +/-, filas de overlay, botones Guardar/✕). Confirmado:
      dispatchear `click` real sobre esos elementos actualiza el estado (en `SyncStereoTestView.jsx`)
      y lo refleja en ambos paneles.
- [x] **(Pedido explícito, sección 9)** El menú vive en el origen de la escena (`0,0,0`) y la
      cámara arriba (`0,3,0`), con la vista inicial mirando al frente (pitch/yaw 0°, no hacia el
      menú) — confirmado leyendo `look-controls` directo por consola, sin interacción de mouse de
      por medio (ver limitación de verificación por screenshot en `problems_solutions.md`).
- [x] **(Pedido explícito, sección 9)** Ningún botón de `#settings-panel` comparte profundidad
      exacta con el fondo del panel (hallazgo del usuario sobre z-fighting) — corregido con un
      offset de `0.01`/`0.02` según corresponda; convención documentada en el skill
      `aframe-elementos-3d`. Confirmado: los botones siguen respondiendo al click.
- [x] **(Pedido explícito, sección 9)** "Volver" y "Cerrar sesión" piden confirmación
      (`#confirm-panel`, Confirmar/Cancelar) antes de ejecutar la acción — ya no disparan directo
      al click/dwell. Confirmado end-to-end para ambas, con Cancelar y con Confirmar.

## 9b. Sección 10 — Ampliación: modo Dual Panel, sincronización avanzada, corrección de audio, y sistema de posición unificado

Retomado (`3-Completed` → `2-Developing`) para esta ampliación. Todo lo de esta sección son pedidos
del usuario en la misma sesión, en orden cronológico.

### 10.1 Investigación previa: por qué el clic real en "GUARDAR CANCIÓN" no respondía

Durante la verificación del Requerimiento 014 (alta de canciones), el usuario reportó que el clic
real en el botón "GUARDAR CANCION" del panel `VRNewSongAf` no hacía nada. Se confirmó simulando un
`pointerdown` real en la posición 3D exacta del botón (vía `object3D.getWorldPosition` +
`camera.project()`): el clic SÍ funciona — el hallazgo fue que el botón queda muy cerca/fuera del
borde superior del viewport con el encuadre de cámara por defecto (NDC y≈1.24, apenas fuera de
[-1,1]). No se corrigió la posición del panel en esta sesión (queda como hallazgo documentado).

### 10.2 Modo "Doble panel" (pestaña Configuración)

Nueva fila clickeable "Doble panel" en `#settings-config-group` (mismo patrón visual que las filas
de Overlays: fila entera resaltada + check), debajo de los steppers de separación/ancho/alto y
antes del botón Guardar — el fondo del panel (`#settings-panel`) se agrandó de `height="2.8"` a
`"3.2"` para que entre sin superponerse. Estado `dualPanel` (`useState(true)`, default `true` para
no cambiar el comportamiento existente) en `SyncStereoTestView.jsx`, persistido junto con
separación/ancho/alto en el mismo `ars-sync-config` (`saveUserSetting`). Al desactivarlo,
`SyncStereoTestView.jsx` **desmonta por completo** el panel derecho
(`{dualPanel && renderPanel('right', ...)}`, no `display:none`) — mismo criterio que ya usa esta
vista para los overlays individuales seleccionados.

### 10.3 Cámara: flechas mueven el contenido, no el menú

Hallazgo: la cámara de la brújula (`<a-camera>` en `SyncConfigCompassMenu.jsx`) traía activo el
`wasd-controls` por defecto de A-Frame, y **es la única capa que recibe el teclado real** en modo
web (mismo motivo que el mouse, ver sección 10.4 del código original) — así que las flechas
alejaban la brújula del menú en vez de acercar el contenido. Se corrigió:
- `wasd-controls="enabled: false"` explícito en la cámara de la brújula (nunca se mueve; el menú
  queda siempre en su lugar) y en la del overlay `karaoke` (`aframe-overlay-modules.html`) — todo
  el movimiento pasa ahora por el mensaje explícito de abajo, no por el control genérico de
  A-Frame.
- La brújula captura `keydown` de las 4 flechas y manda `{action: 'camera-zoom-delta', delta,
  axis: 'forward'|'strafe'}` al padre — ↑/↓ mueven la cámara del overlay a lo largo de hacia dónde
  mira (`getWorldDirection()`, **negado**: sin negar, ↑ alejaba en vez de acercar — three.js
  devuelve el eje +Z local, contrario a "adelante" para esta cámara), ←/→ perpendicular a esa
  misma dirección sin componente Y (strafe estilo FPS).
- `SyncStereoTestView.jsx` reenvía el mismo delta a **ambos** paneles (izquierdo y derecho) del
  modo "Doble panel" — no solo al que originó la tecla — para que el movimiento se aplique a los
  dos a la vez, sin cruzar una posición/rotación absoluta entre paneles (eso es lo que ya se había
  revertido antes por un bug real, ver sección 9 original).

### 10.4 Sincronización con fuente de verdad en el padre (no polling)

Al activar "Doble panel", el panel recién montado arrancaba desincronizado del que ya venía
funcionando: un video reproduciendo y el otro no, un menú de Configuración/Overlays abierto y el
otro cerrado. Causa: la arquitectura previa solo relayaba EVENTOS en el momento en que ocurrían,
sin ninguna fuente de verdad que un panel nuevo pudiera consultar al montar. Se agregó ese patrón
(ya usado por `compassWheelVisibleRef`) a dos estados más, ambos en refs de `SyncStereoTestView.jsx`
(fuente de verdad única):
- **`compassSectionRef`** ('config' | 'overlays' | null): las porciones de la brújula y el botón ✕
  ya NO aplican `__activateSettingsSection`/`closeSettingsPanel` localmente al clickear — mandan la
  intención (`compass-section-changed`) y esperan a que el padre la rebroadcastee a los DOS
  paneles (broadcast idempotente, incluido el emisor). Un panel recién montado la recibe en el
  handshake `compass-ready`.
- **`karaokePlayingRef`** + reloj calculado (`karaokeTimeAtRef`/`karaokeTimeSetAtRef`,
  `getKaraokeCurrentTime()`): el padre NO recibe reportes periódicos de tiempo — lleva su propio
  cronómetro matemático, actualizado solo en los 3 momentos que importan (play/pause/seek): guarda
  en qué segundo estaba el video y cuándo (`Date.now()`) pasó eso, y calcula el tiempo actual
  sumando lo transcurrido si está reproduciendo. A diferencia de `compassSectionRef`, el eco de
  play/pause SÍ excluye al panel emisor (no es idempotente: `video.play()` en un video que ya
  reproduce no vuelve a disparar el evento `'play'`, dejando `suppressNextPlay` trabado en el
  emisor). Un panel de karaoke recién (re)montado manda `karaoke-ready` una sola vez (nunca hace
  polling) y el padre contesta con `karaoke-seek` (tiempo calculado) + play/pause vigente.

### 10.5 Centésimas de segundo en el reproductor

`formatTime()` de `VRKaraokeAf.js` pasó de `M:SS` a `M:SS.CC` (centésimas). Se agregó un loop a
60fps con auto-parada (compara `this._htmlVideo` contra el `video` capturado por closure; en
cuanto dejan de ser el mismo objeto — cambio de canción — el loop se corta solo, sin necesitar un
`remove()` del componente) porque el evento nativo `timeupdate` dispara solo ~4 veces/segundo, muy
poco para que las centésimas se vean correr en vez de saltar. La sincronización entre paneles ya
usaba precisión completa (sin ningún `Math.floor`/`Math.round`/`toFixed` en el pipeline); no hizo
falta cambiar nada ahí.

### 10.6 Volumen en modo "un solo panel"

Hallazgo: el criterio anti-eco existente (panel izquierdo/primario al 1% de volumen, derecho al
100%, para no escuchar las dos pistas superpuestas cuando hay DOS paneles) dejaba el único panel
existente en modo "un solo panel" casi mudo, porque ese criterio no sabía que no había un segundo
panel encargándose del audio — el volumen "subía" recién al activar "Doble panel" en vez de sonar
fuerte desde el principio. Se agregó una prop `singlePanel` (`!dualPanel`, calculada en
`SyncStereoTestView.jsx` y pasada a todos los `SYNCABLE_OVERLAYS`) que fuerza volumen 100% sin
importar si el panel único "sería" izquierdo o derecho — aplicado tanto al overlay `karaoke`
(`aframe-overlay-modules.js`, vía query string del iframe) como al overlay `video`
(`VRLocalVideoOverlaySync.jsx`, vía dato del componente A-Frame, mismo criterio). El criterio
0.01/1.0 original sigue aplicando solo cuando de verdad hay dos paneles sonando a la vez.

## 9c. Sección 11 — Ampliación: sección "Interfaz" y sistema unificado de posición

Pedido del usuario: una nueva sección de la brújula ("Interfaz") con una opción "Position" que
activa los marcadores rojos de `vrPositionControl.js` (hoy siempre visibles, sin ningún toggle) y,
al seleccionar un elemento, muestra su d-pad de movimiento **junto a la brújula** (como
Configuración/Overlays) en vez de anclado a la esquina de cada elemento en la escena del karaoke.

### Decisión de arquitectura (confirmada explícitamente con el usuario)

Se plantearon dos opciones: (a) reubicar el d-pad dentro del MISMO iframe de karaoke (más simple,
sin tocar el protocolo entre iframes, pero no queda realmente "al lado" de la brújula — son
iframes distintos superpuestos), o (b) reconstruir el sistema de d-pad **dentro del iframe de la
brújula**, con el clic en un marcador rojo (iframe de karaoke) viajando por mensaje hasta la
brújula, que muestra su propio d-pad, y cada clic de flecha viajando de vuelta al elemento real.
El usuario eligió (b) explícitamente. Los marcadores rojos y el mecanismo de guardado
(`getUserSetting`/`saveUserSetting`, vista `aframe-view`) de `vrPositionControl.js` se mantienen
tal cual en el iframe de karaoke; lo que cambia es que el d-pad deja de vivir ahí.

### Diseño

- **Brújula**: nueva sección `interface` en `SECTIONS` (junto a `config`/`overlays`/`back`/
  `logout`; con 5 secciones el ángulo por porción pasa de 90° a 72°, calculado automáticamente por
  `WEDGE_THETA_LENGTH = 360 / SECTIONS.length`). `#settings-interface-group` con una fila
  "Position" (mismo patrón checkbox-fila que Overlays) y, debajo, un d-pad genérico (X/Y/Z con
  steppers +/-, mismo patrón visual que los steppers de separación/ancho/alto) que solo se muestra
  cuando hay un elemento seleccionado.
- **Modo posición** (`positionModeRef` en el padre, mismo patrón `compassSectionRef`): togglear
  "Position" manda `compass-toggle-position-mode`; el padre rebroadcastea a las brújulas (para el
  check) y a los overlays de karaoke de AMBOS paneles (para mostrar/ocultar los marcadores rojos).
  Se incluye en el handshake `karaoke-ready` para que un panel de karaoke recién montado arranque
  con la visibilidad correcta de los marcadores sin esperar el próximo toggle.
- **Selección de elemento**: al clickear un marcador rojo en el iframe de karaoke (ya no abre su
  propio d-pad local), se manda `position-element-selected` (`key`, posición actual `[x,y,z]`) al
  padre, que lo guarda como fuente de verdad (`positionSelectedRef`) y lo rebroadcastea a ambas
  brújulas (para que muestren el d-pad con esos valores) — tratado como configuración compartida
  entre paneles, igual criterio que `compass-section-changed`, no como input transitorio de un solo
  panel (a diferencia de `mouse-look-delta`).
- **Mover/Guardar**: cada clic de flecha en el d-pad de la brújula manda `position-move` (`axis`,
  `delta`) al padre, que lo rebroadcastea a los overlays de karaoke de ambos paneles; ahí se aplica
  con la MISMA lógica de `onMove`/`resolveTarget` que ya tenía `vrPositionControl.js` (reutilizada,
  no reescrita), solo que disparada por el mensaje entrante en vez del clic local del d-pad viejo.
  "Guardar" (`position-save`) dispara el mismo `persist()`/`saveUserSetting` ya existente.

### Archivos a modificar (además de la tabla de la sección 6)

| Archivo | Cambio |
|---|---|
| `SyncConfigCompassMenu.jsx` | Sección `interface` en `SECTIONS`; `buildInterfaceGroupHTML()` (fila "Position" + d-pad genérico X/Y/Z); manejo de `position-element-selected`/eco de `position-move`. |
| `SyncStereoTestView.jsx` | `positionModeRef`, `positionSelectedRef`; handlers de `compass-toggle-position-mode`, `position-element-selected`, `position-move`, `position-save` (broadcast a ambos paneles, igual criterio que `compass-section-changed`). |
| `src/views/A-frame/vrPositionControl.js` | Los marcadores arrancan ocultos por defecto; ya no abren un d-pad local al clickear — mandan `position-element-selected` por `postMessage`; exponen una forma de aplicar `position-move`/`position-save` por `key` desde afuera (reutilizando `onMove`/`resolveTarget`/`persist` existentes). |
| `aframe-overlay-modules.js` | Puente de mensajes: `position-mode-changed` (mostrar/ocultar marcadores), `position-move`/`position-save` entrantes (aplicar al elemento por `key`). |
| `src/locales/{es,en,br}.json` | Clave nueva `arsConfig.tab.interface` ("Interfaz") y `config.position`/similares para la fila "Position". |

## 9d. Sección 12 — Ampliación: porción "EXIT" consolidada, anclada y tangente como las demás

Pedido del usuario: "logout y back no se ubican como los demas, agregalos dos en una seccion
llamada EXIT y ubicalo tangente vertical a esta como los demas". Antes, "Volver" y "Cerrar sesión"
eran dos porciones tipo `action` sueltas (`thetaStart` 216°/288°) que no tenían panel propio
anclado a su bisectriz — un clic abría directo el modal fijo `#confirm-panel` en un punto de la
escena ajeno a la porción clickeada, a diferencia de Configuración/Overlays/Interfaz, cuyo panel
aparece tangente al círculo justo en su propia porción (ver sección 11 y el hallazgo de
`PANEL_RADIUS`/rotación `-90 0 -90` documentado en `problems_solutions.md`).

### Diseño

- **`SECTIONS`** pasa de 5 entradas a 4: se elimina el tipo `action` por completo (ya no queda
  ninguna porción de ese tipo) y se reemplazan `back`/`logout` por una única porción `exit`, tipo
  `panel` igual que las otras tres. Con 4 secciones el ángulo vuelve a 90° por porción
  (`config`@0°, `overlays`@90°, `interface`@180°, `exit`@270°), calculado automáticamente por
  `WEDGE_THETA_LENGTH = 360 / SECTIONS.length` — no hay que retocar ningún valor a mano.
- Al ser tipo `panel`, "EXIT" queda incluida gratis en el mecanismo genérico de anclaje/tangencia
  (`SECTION_BISECTOR`, `#settings-panel-anchor`, `PANEL_RADIUS`) ya usado por las otras tres — no
  hizo falta ningún caso especial de posicionamiento.
- **`buildExitGroupHTML()`** (nuevo, mismo patrón de fila clickeable que
  `buildOverlaysGroupHTML()`): dos filas, "Volver" y "Cerrar sesión", dentro de
  `#settings-exit-group`. A diferencia de las demás filas del panel (que mandan `postMessage` al
  padre), cada fila llama directo a `window.__requestConfirm(action)` — la misma función que ya
  usaban las porciones `action`, sin cambios — así el modal de confirmación (`#confirm-panel`,
  mensaje + Confirmar/Cancelar + botón "login-test" en "Cerrar sesión") sigue funcionando igual
  que antes.
- El click handler genérico de las porciones (`.compass-wedge`) se simplificó: al no quedar
  ninguna porción tipo `action`, se eliminó la rama `if (wedgeEl.dataset.type === 'action')` — toda
  porción manda `compass-section-changed` sin excepción.

### Verificación

Medido en vivo (misma técnica que la sección 11: `object3D.localToWorld()` sobre `#settings-panel`
tras activar `exit` con `window.__activateSettingsSection('exit')`): bisectriz del ancla en 315°
(= 270° + 90°/2, correcto), borde inferior del panel a distancia radial 1.200 (= `RADIUS`, tangente
igual que las otras tres secciones), borde superior a 5.800, bordes izquierdo/derecho simétricos a
3.669 — mismos valores ya verificados para Configuración/Overlays/Interfaz. Se confirmó además que
clickear "Volver"/"Cerrar sesión" dentro del panel "EXIT" cierra `#settings-panel` y abre
`#confirm-panel` con el mensaje correcto (`confirmBack`/`confirmLogout`) y, en el caso de "Cerrar
sesión", el botón "login-test" visible — sin errores de consola.

### Archivos a modificar (además de la tabla de la sección 6)

| Archivo | Cambio |
|---|---|
| `SyncConfigCompassMenu.jsx` | `SECTIONS` (4 porciones, todas `panel`, `exit` reemplaza a `back`/`logout`); `buildExitGroupHTML()`; simplificación del click handler de porciones (sin rama `action`); `settings-title`/`__activateSettingsSection` reconocen `exit`. |
| `src/locales/{es,en,br}.json` | Clave nueva `arsConfig.tab.exit` ("🚪 EXIT", mismo literal en los 3 idiomas por pedido explícito del usuario). Reusa `home.back`/`home.logout`/`home.confirmBack`/`home.confirmLogout` ya existentes para las filas y el modal. |

## 8. Referencias

- Requerimiento 002 (descartado, origen de `mirror-fix`): `ApprendeVr/Documentation/Requerimientos/4-Rejected/Discarded/002-boton-ar-y-fix-espejo-overlay-estereo/`.
- Requerimiento 010 (configuraciones de usuario por vista; precedente de widgets 3D clickeables en
  `vrPositionControl.js`): `ApprendeVr/Documentation/Requerimientos/2-Developing/010-configuraciones-usuario-por-vista/`.
- Requerimiento 011 (overlay karaoke, patrón de overlay real vía `src`): `ApprendeVr/Documentation/Requerimientos/2-Developing/011-estandarizar-overlay-aframe-mirror-fix/`.
- Requerimiento 012 (mecanismo propio de gaze/dwell/click, fullscreen, sync de video — origen del
  mecanismo de interacción reutilizado acá; commit `dea919b`): `ApprendeVr/Documentation/Requerimientos/2-Developing/012-ajustes-arstest-mirror-cursor-fullscreen/`.
- Skill `overlay-ar-sync-aframe`: `.claude/skills/overlay-ar-sync-aframe/SKILL.md`.
- Skill `aframe-elementos-3d` (nuevo en esta sesión, ver sección 9): convención de offset de
  profundidad para elementos 3D con botones — `.claude/skills/aframe-elementos-3d/SKILL.md`.
- Precedente de widgets 3D clickeables y proyección mundo→pantalla:
  `src/views/A-frame/vrPositionControl.js` (`makeButton`, `setupSharedRaycast`, `worldToScreen`).
- Interfaz de persistencia reutilizada: `src/views/A-frame/vrUserSettingsApi.util.js`
  (`getUserSetting`, `saveUserSetting`, `detectDeviceType`).

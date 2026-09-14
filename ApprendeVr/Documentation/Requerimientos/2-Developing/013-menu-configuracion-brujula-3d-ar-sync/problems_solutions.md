# Problemas y soluciones — Requerimiento 013

Recordatorio de la regla de hallazgos tardíos (ver skill `crear-requerimiento`): si un item de
`checklist.md` o un criterio de aceptación ya marcado `[x]` resulta no estar realmente resuelto,
corregir la marca y registrar acá el hallazgo indicando explícitamente que fue tardío.

## 2026-09-09 — Hallazgo del usuario: `#settings-panel` y `#confirm-panel` podían quedar los dos abiertos

**Problema:** "solo se puede desplegar un panel de configuración a la vez, si otro está abierto y
selecciono una sección nueva la anterior se cierra" — ninguna de las dos funciones que abren un
panel (`__activateSettingsSection` para Configuración/Overlays, `__requestConfirm` para
Volver/Cerrar sesión) cerraba la OTRA, así que si estaba abierto `#settings-panel` y se activaba
"Volver", ambos quedaban visibles superpuestos (comparten la misma posición/orientación).

**Solución:** cada función ahora cierra la otra antes de mostrarse — `__activateSettingsSection`
llama a `window.__closeConfirmPanel()`, `__requestConfirm` llama a `window.__closeSettingsPanel()`
(ambas expuestas en `window` por su propio script, mismo patrón que `__activateSettingsSection`).
Confirmado en navegador en ambos sentidos: Configuración abierta → Volver reemplaza por el panel
de confirmación; Overlays abierto → mismo resultado.

## 2026-09-09 — Ajustes visuales: dona gris uniforme, click solo en el texto, texto radial

Tres pedidos del usuario sobre el mismo componente, encadenados:

1. **"cambia el color de las secciones... quiero que todas sean en fondo gris transparente, y en
   el centro agrega un círculo para que el menú quede como dona y no como círculo completo"** —
   las 4 porciones pasaron de `<a-cylinder>` con un color distinto cada una a `<a-ring>`
   (`radius-inner`/`radius-outer`, ver `RING_INNER_RADIUS`) con el mismo gris semitransparente
   (`WEDGE_COLOR`/`WEDGE_OPACITY`) — el hueco central es el que da la forma de dona. Al ser
   `a-ring` una geometría plana (sin grosor, a diferencia del cilindro), pasó a llevar
   `rotation="-90 0 0"` igual que el resto de elementos "tirados en el piso" de este archivo.
2. **"el click se debe detectar solo en el texto de cada sección"** — se sacó la clase
   `.clickable` y los `data-*` del anillo decorativo; ahora el objetivo real es un `<a-plane>`
   invisible (`opacity: 0.01`, mismo criterio que `mic-icon` en `VRLocalVideoOverlaySync.jsx` —
   la opacidad no desactiva el raycaster, `visible` sí) del tamaño del texto, no de toda la
   porción.
3. **"el texto se debe ubicar del centro hacia afuera ubicado radialmente"** — en vez de intentar
   componer una única rotación Euler `"x y z"` (el orden de composición no es obvio sin probarlo),
   se armó con 3 rotaciones simples anidadas, una por `<a-entity>`: (1) gira todo el grupo en Y
   por la bisectriz de la porción — ubica el eje +Z local apuntando radialmente hacia afuera; (2)
   gira -90 en Y — alinea el eje de lectura del texto (+X) con ese +Z radial, y ubica el grupo a
   mid-radio a lo largo de ese eje; (3) tira el texto/plano plano contra el piso con -90 en X, sin
   tocar el eje +X ya alineado en el paso 2. Confirmado visualmente: el texto de las 4 porciones
   se lee efectivamente "de adentro hacia afuera" (las del lado opuesto del círculo quedan boca
   abajo respecto a un espectador fijo — es el resultado esperado de una orientación radial pura,
   no una orientación "siempre legible"; el usuario pidió específicamente "radialmente").

Confirmado en navegador (forzando el pitch de la cámara a mano, ver hallazgo de reubicación de
cámara/menú más abajo, para poder ver la brújula desde arriba): dona gris con hueco central, 4
textos radiales, click en el plano invisible sigue abriendo/activando cada sección.

## 2026-09-09 — Hallazgo del usuario: botones a la misma profundidad que su fondo (z-fighting) + skill nuevo

**Problema señalado por el usuario:** "cuando creas elementos en 3D y estos tienen botones, los
botones no pueden estar en la misma posición del plano ya que se mezclan los colores y la
funcionalidad del click puede fallar" — los botones del panel `#settings-panel` (steppers,
filas de overlay, "Guardar") se habían agregado a la MISMA profundidad que el fondo del panel
(mismo `z` relativo al padre, ya que ninguno de los dos tenía rotación propia) — z-fighting real
(parpadeo/mezcla de color) y riesgo de que el raycaster intersecte el fondo en vez del botón.

**Corrección del usuario sobre el eje del offset:** "el offset puede ser en x,y,z dependiendo de
la perpendicularidad del plano que contiene el elemento" — el eje correcto no es siempre `z`, es
el eje LOCAL perpendicular a la cara del plano de abajo (su normal), que cambia según la rotación
propia de ese plano (no la de un antepasado más arriba en la jerarquía que rote el grupo entero de
forma uniforme — eso no cambia el eje a usar entre hermanos que comparten ese mismo padre y no
tienen rotación propia entre sí).

**Solución:** se agregó un offset de `0.01` (0.02 para el título, que puede superponerse
visualmente con el botón ✕) en el eje correspondiente a cada botón/fila de `#settings-panel`
(steppers, filas de overlay, ambos botones "Guardar", botón ✕) — confirmado que siguen
respondiendo al click tras el ajuste (steppers y toggle de overlay probados en navegador). Se creó
el skill `aframe-elementos-3d` (`.agents/skills/aframe-elementos-3d/SKILL.md`) documentando la
convención para que se aplique en cualquier elemento 3D nuevo del proyecto, no solo acá.

## 2026-09-09 — Pedido: panel de confirmación para "Volver"/"Cerrar sesión"

**Pedido del usuario:** "agrega un panel de confirmación para la sección de BACK y LOGOUT".

**Implementado:** las porciones tipo "action" ya no disparan `compass-do-action` directo al
click/dwell — primero abren `#confirm-panel` (mismo lugar que `#settings-panel`, nunca están
abiertos los dos a la vez) con el mensaje correspondiente (`home.confirmBack`/`home.confirmLogout`,
nuevas claves i18n) y dos botones ("Confirmar"/"Cancelar", `home.confirmYes`/`home.confirmCancel`).
Solo al confirmar se manda `compass-do-action`; cancelar solo cierra el panel, sin efecto. Sigue
usando el mismo mecanismo `.clickable` + dwell/click ya establecido, con los offsets de
profundidad correctos (ver hallazgo de arriba). Confirmado en navegador de punta a punta para
ambas acciones: "Volver" con Cancelar (se queda en AR-SYNC) y con Confirmar (cierra AR-SYNC);
"Cerrar sesión" con Confirmar (borra `apprendevr_auth` y navega a `/`).

`dwell: false` en "Cerrar sesión" (Requerimiento 013, hallazgo anterior) se mantuvo sin cambios:
aunque ahora un dwell accidental solo abriría el panel de confirmación (no la acción real), sigue
siendo una molestia evitable sin costo — las dos protecciones son complementarias, no redundantes.

## 2026-09-09 — Pedido explícito: el panel de sección debe ser 3D interactivo con el raycaster, no HTML 2D

**Pedido del usuario:** "al seleccionar una sección del menú el panel que se despliega debe ser un
elemento 3D no 2D, debe poder interactuar con el cursor del raycaster" — corrige la decisión de
diseño original (sección 5 de `requerimiento.md`, "sin reescribir esos controles como widgets
3D"), que había sido tomada deliberadamente por falta de precedente de sliders/checkboxes 3D en
el repo.

**Estado: implementado.** Panel 3D real (`#settings-panel`) dentro de `#compass-root`, hijo de la
brújula (NO de `<a-camera>` — un panel pegado a la cámara pondría todos sus botones siempre en el
mismo punto de la pantalla, haciendo imposible apuntar a botones distintos con la mirada, ver
razonamiento completo en el hallazgo de reubicación de abajo), tirado plano contra el suelo
(`rotation="-90 0 0"`, mismo criterio que el círculo/las flechas) para que cada botón ocupe una
posición distinta que el usuario pueda mirar. Interactúa con el mismo `.clickable` +
raycaster/dwell ya establecido — no fue necesario ningún mecanismo nuevo de interacción.

Contenido: steppers +/- (no sliders arrastrables — sin precedente en el repo, ver diseño técnico
original) para Separación/Ancho/Alto, filas clickeables con check para cada overlay (etiquetas
cortas nuevas `syncConfig.overlay.cameraShort/videoShort/coneShort/karaokeShort`, las descripciones
largas existentes no entran en una fila angosta de 3D), botón ✕ para cerrar, botones Guardar por
pestaña. El estado real (separación/ancho/alto/overlays/guardado/sesión) sigue viviendo en
`SyncStereoTestView.jsx` (que sí puede `getUserSetting`/`saveUserSetting`); el panel solo cachea lo
último recibido por `compass-config-state` y manda deltas/acciones
(`compass-update-separation/width/height`, `compass-toggle-overlay`,
`compass-save-config`/`compass-save-overlays`) — mismo patrón ya usado por el widget de posición.

**Hallazgo corregido durante la implementación:** los nombres de campo no coincidían entre los dos
lados — `SyncStereoTestView.jsx` usa `panelWidth`/`panelHeight` (nombres de estado/DB, ver
`saveConfig`), pero `CONFIG_FIELDS` del lado de la brújula usa `width`/`height` (para que la acción
`compass-update-width` combine limpio con el nombre del campo). Sin el alias, el panel mostraba
"Width: undefinedpx"/"Height: undefinedpx" — confirmado y corregido aliasando en el mensaje
(`{ width: panelWidth, height: panelHeight, ... }`) en vez de renombrar el estado interno.

**Confirmado en navegador:** abrir "Configuración" y "Overlays" muestra los valores reales en
AMBOS paneles estéreo (izquierdo y derecho, disparando el click en cada wedge por separado, como
haría cada raycaster/cámara sincronizados de forma independiente); un stepper (Width +20) actualizó
el valor mostrado en ambos paneles; togglear "Cono" activó de verdad ese overlay (visible en el
video de fondo de ambos paneles); guardar sin sesión se queda en verde (comportamiento correcto,
`saveUserSetting` no llega a intentar la llamada); cerrar con ✕ oculta el panel. `SyncConfigMenu.jsx`
(HTML 2D, ya sin ningún consumidor) se eliminó.

## 2026-09-09 — Reubicación pedida por el usuario: menú en el origen, cámara arriba

**Pedido, en dos pasos:**
1. "quiero que el menú esté en la posición 0,0,0 y la cámara en la posición 0,3,0".
2. Tras probarlo: "el menú aparece al frente no en el suelo, la cámara debe estar arriba del menú
   pero en el centro x=0, y=3, z=0" — y finalmente: "quiero que el menú esté abajo, la vista
   inicial esté hacia el frente no hacia el menú" (la cámara arranca mirando horizontal, no
   apuntando al menú — el usuario baja la mirada para verlo, como mirar al piso).

**Implementado:** `MENU_POSITION = {x:0,y:0,z:0}`, `CAMERA_POSITION = {x:0,y:3,z:0}` en
`SyncConfigCompassMenu.jsx` (reemplazan a los anteriores `GROUND_Z=-4`/`CAMERA_Y=1.8`). El pitch
inicial del reticle, que en el Requerimiento 012 SÍ apuntaba al objetivo (video/menú) a propósito,
acá se dejó en `0` (mirando al frente) por pedido explícito del paso 2 — es una diferencia de
diseño consciente respecto al patrón de Req 012, no un descuido.

**Hallazgo (verificación, no bug de producto):** al confirmar el paso 1, la mirada apuntando al
menú (pitch -90°, derecho hacia abajo) parecía "no funcionar" — se veía un ángulo raro o el menú
"al frente" en vez de abajo. Se diagnosticó con `look-controls.pitchObject.rotation.x` leído
directamente por consola: **la fórmula y la asignación inicial eran correctas** (-90° exacto,
estable durante 15 lecturas seguidas sin interacción) — lo que la desviaba era el propio mouse del
entorno de automatización: cualquier acción `computer.screenshot`/`click` posterior movía el
cursor sobre el iframe, y `look-controls` (arrastre de mouse en desktop) lo interpretaba como que
el usuario estaba mirando alrededor, rotando pitch/yaw lejos del valor inicial (confirmado: pitch
pasó de -90° a -51° tras una sola captura de pantalla intermedia). No se tocó código por esto — es
el comportamiento esperado de una cámara con `look-controls` real (el usuario también puede mirar
alrededor arrastrando o con el giroscopio); solo se documenta para que quede claro que **la
verificación por screenshot en este entorno no sirve para confirmar un pitch exacto** — hay que
leer `look-controls` directo por consola, inmediatamente después de cargar, sin ninguna acción de
mouse de por medio.

**Implicación para el panel 3D (aplicada, ver entrada de arriba "Pedido explícito: el panel de
sección debe ser 3D interactivo"):** un panel con varios botones no puede ir pegado a
`<a-camera>` — al moverse siempre junto con la cámara, TODOS sus botones quedarían fijos en el
mismo punto de la pantalla (el centro, donde también está el reticle), y el usuario nunca podría
apuntar a un botón distinto de otro girando la cabeza, porque el panel entero giraría con él. Por
eso `#settings-panel` se construyó como hijo de `#compass-root` (coordenadas del mundo/escena,
como la brújula), no de la cámara.

**Pendiente:** el marcador/d-pad de posición sigue con el layout pensado para la cámara anterior
(casi horizontal, elevado en Y) — con la cámara ahora arriba mirando al frente por defecto (y el
usuario bajando la mirada para ver el menú), convendría revisar su ubicación/orientación para que
quede igual de accesible que `#settings-panel` (que si se reubicó, ver entrada de arriba).

## 2026-09-09 — Ampliación: widget de posición, secciones "Volver"/"Cerrar sesión" y panel duplicado por ojo

Ampliación pedida por el usuario sobre la brújula ya implementada, con tres pedidos concretos:

1. **Widget de posición**: agregar un componente para mover la brújula y guardar su ubicación en
   base de datos. Implementado como marcador 📍 + d-pad (mismo patrón visual que
   `vrPositionControl.js`, Requerimiento 010) dentro de `SyncConfigCompassMenu.jsx`, con
   persistencia real en `SyncStereoTestView.jsx` vía `getUserSetting`/`saveUserSetting`
   (`ars-sync-compass-position`) — el widget no puede hacer `fetch` directo dentro de su `srcDoc`,
   así que pide/envía la posición por postMessage (`compass-ready`, `compass-set-position`,
   `compass-save-position`).
2. **"Agregar también a las secciones del menú los dos botones actuales Back y Back to Home
   (reemplaza por LOGOUT)"**: la brújula pasó de 2 a 4 porciones (90° cada una en vez de 180°).
   Las dos nuevas son tipo "action" (disparan de inmediato, sin panel): "Volver" (reemplaza al
   botón "Volver" que tenía `SyncStereoTestView.jsx`, ahora quitado) y "Cerrar sesión" (reemplaza
   al botón "← Volver a inicio" de `ARTestMirrorButton.jsx`, oculto mientras AR-SYNC está abierto
   — con una acción más fuerte: borra también `apprendevr_auth` de `localStorage`, no es solo un
   alias de "volver a inicio").
3. Corrección pedida tras probarlo: "el menú que se despliega debe verse en la vista 3D, en ambos
   paneles... el usuario no debe quitarse las gafas" — ver hallazgo de más abajo.

## 2026-09-09 — Hallazgo: reenviar la rotación de cámara de la brújula a los overlays de contenido desalineaba el video entre paneles

**Problema (reportado por el usuario):** "has desfazado las vistas de los overlays en los dos
paneles" / "en el panel izquierdo veo el video abajo, en el derecho se ve arriba del menú". El
video (`VRLocalVideoOverlaySync.jsx`) y la brújula aparecían en alturas distintas entre el panel
izquierdo y el derecho, rompiendo la fusión estéreo.

**Causa:** al hacer que la brújula fuera la capa más externa (recibe el drag/gyro real en vez de
los overlays de contenido, ver diseño técnico), se agregó en `SyncStereoTestView.jsx` un reenvío
de `camera-rotation`/`camera-position` de la brújula hacia TODOS los overlays activos de ambos
paneles (no solo entre las dos instancias de la brújula). Esto pisaba el pitch inicial que cada
overlay de video/cono calcula para apuntar a su propio plano (`initialCursorPitch`, Requerimiento
012) con el pitch de la brújula (distinto, calculado para apuntar al suelo de la brújula) — y como
cada panel recibía ese mensaje en un instante ligeramente distinto (polling cada 16ms, sin
garantía de sincronía exacta entre iframes), el video terminaba en una altura distinta en cada
panel.

**Solución:** revertido — la brújula ahora solo relaya su propia `camera-rotation`/`camera-position`
entre sus DOS instancias (izquierda/derecha), igual criterio que el resto de overlays (nunca cruza
a un tipo distinto). El caso que se intentaba cubrir (que el contenido bajo la brújula siga
girando en desktop, ya que dejó de recibir el drag directo) queda sin resolver — es la misma
limitación que ya existía al apilar dos overlays de contenido a la vez (solo el que está más
arriba en el DOM recibe el drag real); en mobile (uso real, gyro) no aplica, porque
`deviceorientation` llega a todos los iframes por igual sin necesitar relay.

## 2026-09-09 — Hallazgo: el dwell podía disparar "Cerrar sesión" sin que el usuario lo pidiera

**Problema:** durante la prueba en el entorno de automatización (con el loop de render
congelado, ver hallazgo de más abajo), la vista navegó sola a la página de inicio (con
`apprendevr_auth` borrado de `localStorage`) sin que se hubiera clickeado nada — el reticle había
quedado "congelado" apuntando a la porción "Cerrar sesión" desde antes de que `document.hidden`
se pusiera en `true`, y el temporizador de dwell (basado en `Date.now()`, no en el tick de A-Frame)
completó igual los 2500ms en tiempo real, disparando el click sintético sobre esa porción.

**Por qué importa más allá del entorno de prueba:** aunque el disparo puntual fue un artefacto del
entorno de automatización, el mecanismo de fondo es real: si un usuario real deja la mirada
apoyada sobre "Cerrar sesión" el tiempo del dwell (2.5s) — por ejemplo mientras lee las etiquetas
de las porciones, o por imprecisión del seguimiento de cabeza en VR — cerraría sesión sin
proponérselo. Es una acción destructiva (borra la credencial guardada) para dejarla alcanzable por
un mecanismo pensado para acciones reversibles (abrir un panel, volver a la lista).

**Solución:** la porción "Cerrar sesión" se marcó `dwell: false` en `SECTIONS` — el `tick()` de
`SyncConfigCompassMenu.jsx` ya no cuenta ni completa el fuse sobre esa porción (el reticle se
queda blanco/neutro en vez de ponerse rojo y achicarse), solo responde a click directo real. El
resto de porciones ("Volver", "Configuración", "Overlays") sigue siendo alcanzable por dwell —
son todas reversibles (cierran/abren algo, nunca borran nada).

## 2026-09-09 — `artest-mirror.html` no estaba en `vite.config.js`, un error de sintaxis real pasó un build "exitoso"

**Problema:** al escribir `SyncConfigCompassMenu.jsx` se dejó sin querer una comilla invertida
(`` ` ``) dentro de un comentario HTML embebido en el propio `srcDoc` (template literal): la línea
decía `` El <a-cursor> primitivo sigue trayendo consigo el componente `cursor` por defecto ``. Esa
comilla invertida cierra el template literal de JS antes de tiempo — un error de sintaxis real.
`npm run build` corrió limpio de todas formas.

**Causa:** `src/views/ARs/ARScomponents/ARStest/mirror-fix/artest-mirror.html` (el punto de
entrada de AR-TEST/AR-SYNC) nunca estuvo registrado en `build.rollupOptions.input` de
`vite.config.js` — solo `main`, `mobile`, `aframe` y `aframeOverlayModules` lo están. Sin esa
entrada, Vite/esbuild nunca llega a transformar `artest-mirror.jsx` → `SyncStereoTestView.jsx` →
`SyncConfigCompassMenu.jsx` durante `vite build`, así que el archivo con el error de sintaxis
simplemente nunca se parseaba, y `npm run build` reportaba éxito sin haber tocado ese código. Esto
significa que el criterio de aceptación "`npm run build` termina sin errores" que usan este
requerimiento y los anteriores (002, 011, 012) **nunca fue una verificación real** para los
archivos de `SyncStereoTestView.jsx`/`SyncConfigMenu.jsx`/overlays de AR-SYNC — solo lo es para
`aframe-overlay-modules.html` (que sí está registrado, por el Requerimiento 011).

**Cómo se encontró:** al intentar probar la brújula 3D en un navegador real (Claude en Chrome), el
servidor `vite dev` usa HTTPS con certificado autofirmado (`ssl/key.pem`/`cert.pem`) que el
navegador controlado por la extensión no puede pasar (interstitial de seguridad bloqueado — la
extensión se niega a interactuar con páginas de error de certificado, correctamente). Para probar
sin ese bloqueo se sirvió el `dist/` compilado con un `http.server` plano, lo que exigió agregar
`artest-mirror.html` como entrada de build — y ese build reveló el error de sintaxis real que el
build anterior (sin esa entrada) nunca había detectado.

**Solución:** 1) corregir la comilla invertida suelta en `SyncConfigCompassMenu.jsx` (reemplazada
por comillas dobles normales, ya que está dentro de un comentario HTML, no de código). 2) Se
decidió **dejar** `artestMirror` agregado permanentemente en `vite.config.js` (no revertirlo) —
aunque no estaba en el alcance original documentado en `requerimiento.md`, es un cambio aditivo,
de bajo riesgo (solo registra un archivo estático existente como entrada de build, no cambia
comportamiento de ningún archivo), y hace que el criterio de aceptación "`npm run build` sin
errores" sea una verificación real para este código a partir de ahora. Se documentó en la tabla
"Archivos a modificar" de `requerimiento.md`.

**Estado:** resuelto — build limpio confirmado después del fix, con `artest-mirror.html`
efectivamente incluido en la transformación.

## 2026-09-09 — El entorno de automatización usado para probar congela el loop de render/tick de A-Frame dentro de los iframes de la brújula

**Problema:** al probar la brújula en el navegador controlado por la extensión Claude en Chrome
(sirviendo `dist/` por `http.server` plano para evitar el bloqueo de certificado autofirmado, ver
hallazgo anterior), la rotación animada de `#compass-wheel` al activar una flecha (mecanismo
`animation__compass-rotate` de A-Frame) nunca se veía aplicarse, ni siquiera esperando varios
segundos.

**Causa (diagnosticada por consola):** `document.hidden` es `true` dentro de **todos** los iframes
de la página en este entorno (confirmado con `iframe.contentDocument.hidden` para los cuatro
iframes activos: brújula y video, ambos paneles). Con la página/pestaña considerada "oculta" por
la Page Visibility API, Chrome frena `requestAnimationFrame`, que es lo que impulsa el loop
`tick()` de A-Frame — así que ningún componente que dependa de `tick()` (el componente
`animation`, la actualización continua de `raycaster.intersectedEls`, la aplicación de
`look-controls.pitchObject` a la cámara real) avanza, aunque `scene.isPlaying` siga reportando
`true`. Esto es un efecto del entorno de automatización (la ventana de Chrome que controla la
extensión probablemente no tiene foco real de SO), no del código: es la misma clase de limitación
que ya documentó el Requerimiento 012 para la Fullscreen API
(`document.documentElement.requestFullscreen()` fallaba con `TypeError: Permissions check failed`
en ese mismo entorno).

**Cómo se confirmó que la lógica en sí es correcta (no es un bug del código):** se forzó
manualmente `scene.tick(t, dt)` en un bucle corto vía la consola — con eso, la rotación de
`#compass-wheel` sí se aplicó exactamente a 180° (`STEP_DEG = 360/2`), y visualmente las dos cuñas
intercambiaron de posición en el panel probado. Esto aísla el problema al loop de render
congelado, no al cálculo de `rotateWheel()`/`STEP_DEG` ni al componente `animation`.

Por el mismo motivo (raycaster sin ticks nuevos), la selección de sección por **dwell** sí se
alcanzó a ver funcionar de punta a punta (el panel de "Configuration" se abrió solo tras esperar el
tiempo de dwell) — pero probablemente porque el reticle capturó una intersección válida en un tick
inicial (antes de que el entorno terminara de "ocultar" la pestaña) y esa lectura quedó congelada;
el timer de dwell en sí (`setInterval` + `Date.now()`) no depende de `tick()` y sí corrió en tiempo
real, completando el fuse sobre ese target congelado.

**Estado:** no es un bug de este requerimiento — limitación conocida y ya documentada del entorno
de automatización (mismo patrón que Req 012). **Pendiente de confirmación manual del usuario** en
un navegador normal (con la pestaña realmente enfocada/visible) o en un dispositivo real, para
confirmar que la animación de rotación y el click directo (pipeline nativo de `cursor` de
A-Frame) se ven y funcionan correctamente con el loop de render corriendo con normalidad — ver
`checklist.md`, Fase 2.

## 2026-09-12 — Hallazgo: los overlays seleccionados no se guardaban/recuperaban para `prueba@gmail.com` (login-test)

**Problema:** el usuario reportó que la selección de overlays del menú de AR-SYNC no se guardaba
ni recuperaba correctamente para el usuario de prueba (`prueba@gmail.com`), el que se activa con
"login-test" al confirmar "Cerrar sesión". Confirmado contra la base de datos: la fila
`ars-sync-overlays` de `prueba@gmail.com` (id 31) quedaba en `["camera","video"]` — el default — no
en la selección real del usuario.

**Causa (bug de closure de React):** en `SyncStereoTestView.jsx`, `handleMessage` se registra UNA
sola vez (`useEffect(..., [])`), así que captura las referencias de `saveSelectedOverlays`/`saveConfig`
del PRIMER render. Esas funciones guardaban el estado del primer render (`selectedOverlays =
['camera','video']`, `separation = 24`, etc.), no el actual — por eso al pulsar "Guardar" desde la
brújula se persistía siempre el default. El ref `configStateRef` ya existía (se usa en
`compass-ready`) precisamente para este problema, pero las dos funciones de guardado no lo usaban.

**Solución:** `saveSelectedOverlays` y `saveConfig` ahora leen de `configStateRef.current` (que se
refresca tras cada render) en vez del closure. Confirmado con build de Vite limpio.

**Hallazgo relacionado (mismo flujo de login-test, distinto síntoma):** la vista
`ars-sync-compass-position` (posición 3D de la brújula, widget 📍 + d-pad) no estaba registrada en
el backend — faltaba en `KNOWN_VIEWS` (`user-settings.util.ts`) y en el seed de `settings_views`
(la tabla solo tenía 5 filas). Por eso su `GET`/`PUT /api/user-settings/ars-sync-compass-position`
devolvía `400 UNKNOWN_VIEW` y la posición de la brújula nunca se persistía ni recuperaba. Se agregó
la vista siguiendo el mismo patrón que `ars-sync-config` (Requerimiento 012): entrada en
`KNOWN_VIEWS`, validador `isValidArsSyncCompassPositionConfig` (`{x, y, z}` números finitos),
migración `db/008-ars-sync-compass-position-view.sql` (INSERT en `settings_views`) montada en
`docker-compose.yml`, y aplicación manual del seed al contenedor ya iniciado (`docker-entrypoint-
initdb.d` solo corre en la primera inicialización del volumen). Suite `user-settings` 55/55 verde,
`nest build` limpio.

**Estado:** resuelto — corregido en `SyncStereoTestView.jsx` (guardado lee del ref) y en el
backend (vista `ars-sync-compass-position` registrada + seed aplicado).

## 2026-09-14 — Ampliación (sección 10-11): sin verificación manual en navegador para la sección "Interfaz"/Position

**Contexto:** implementación de la sección "Interfaz" + d-pad unificado de posición (Fase 12 del
checklist). A diferencia del resto de la ampliación de esta sesión (Doble panel, cámara,
sincronización, volumen, centésimas — todas probadas con clics reales/simulados en la pestaña del
usuario), esta pieza se implementó y se verificó solo con `npm run build`/`npm run check:i18n`
(ambos limpios) — la pestaña de Chrome disponible estaba en uso activo del usuario durante esta
parte de la sesión, así que no se hizo la prueba manual end-to-end (activar "Position", clickear un
marcador, mover con el d-pad de la brújula, Guardar, recargar).

**Riesgo principal no descartado por build**: la comunicación entre 3 iframes (marcador en
karaoke → padre → d-pad en brújula → padre → aplicación en karaoke) es la cadena de mensajes más
larga de todo lo construido en esta sesión; un error de nombre de acción/campo entre alguno de los
saltos no lo detecta ni el build ni el chequeo de i18n, sería visible.

**Estado:** pendiente de confirmación manual — ver checklist.md ítem 12.9.

## 2026-09-14 — Ampliación (sección 12): "Volver"/"Cerrar sesión" no tenían panel anclado como las demás porciones

**Contexto:** tras verificar que el panel de sección (Configuración/Overlays/Interfaz) quedaba
correctamente anclado y tangente a su porción (ver hallazgo anterior sobre `PANEL_RADIUS`/rotación
`-90 0 -90`), el usuario notó que "Volver" y "Cerrar sesión" seguían sin ese comportamiento:
eran porciones tipo `action` que abrían directo el modal fijo `#confirm-panel` en un punto ajeno a
la porción clickeada, sin ningún panel propio que rotara/tangenciara junto a su bisectriz.

**Causa:** el diseño original (Fase 8 del checklist) trató "acción destructiva" y "sección de
configuración" como dos mecanismos distintos desde el principio — `type: 'action'` vs.
`type: 'panel'` — y solo el segundo se integró más tarde al sistema genérico de anclaje de la
sección 11. Nunca hubo intención explícita de dejarlas así; simplemente no se había pedido
consolidarlas hasta este momento.

**Solución:** se eliminó el tipo `action` por completo. "Volver"/"Cerrar sesión" pasaron a ser dos
filas (`buildExitGroupHTML()`) dentro de una única porción nueva `exit` (tipo `panel`, igual que
las otras tres) — queda incluida gratis en el mecanismo de anclaje/tangencia genérico, sin ningún
caso especial. Cada fila sigue llamando a `window.__requestConfirm(action)` (sin cambios), así que
el modal de confirmación se comporta exactamente igual que antes; lo único que cambió es que ahora
se llega a él desde un panel propio, tangente a la porción "EXIT", en vez de una porción sin panel.

**Verificación:** medido en vivo con `object3D.localToWorld()` (misma técnica que la sección 11) —
bisectriz del ancla en 315° (= 270° + 90°/2), borde inferior del panel a radio 1.200 (= `RADIUS`,
tangente), igual que las otras tres secciones. Flujo de confirmación (clic en fila → cierra panel →
abre `#confirm-panel` con el mensaje correcto) verificado sin errores de consola. `npm run build`
y `npm run check:i18n` verdes.

**Estado:** resuelto y verificado en navegador (a diferencia del hallazgo anterior sobre
Interfaz/Position, este sí se pudo probar end-to-end en esta sesión).

## 2026-09-14 — Reporte del usuario: "al iniciar le di al boton play y solo inicio el video en un panel"

**Contexto:** el usuario pidió primero verificar en los commits recientes si esto ya estaba
resuelto antes y qué cambió. Se revisó el historial de `SyncStereoTestView.jsx` y
`aframe-overlay-modules.js` (`git log -G"karaoke-play"` y `git diff` completo desde el commit
`9479e5c` que implementó la sincronización play/pause/seek por reloj del padre): **ningún commit
posterior tocó ese mecanismo** — los commits recientes de la otra sesión concurrente (ver hallazgo
anterior sobre commits inesperados) solo tocaron `SyncConfigCompassMenu.jsx`/`vrPositionControl.js`
(edición de posición), no el puente de video de karaoke. No hay entonces una "regresión por commit"
que revertir.

**Causa real (gap de diseño preexistente, no una regresión):** `aframe-overlay-modules.js` wirea
el `<video>` real de cada panel recién cuando `watchVideoElement()` (poll cada 300ms) detecta que
`vr-karaoke-af` ya creó `this._htmlVideo` — hasta ese momento, `video` es `null` en el bridge de
ESE panel. El listener de `postMessage` que aplica un `karaoke-play`/`karaoke-pause` remoto tenía
una guarda `if (!video) return;`: si el usuario tocaba el botón Play muy rápido justo al abrir
AR-SYNC (antes de que el panel hermano terminara de montar A-Frame + encontrar
`#karaoke-vr-component`), ese mensaje se descartaba en silencio, sin ningún reintento — dependía
por completo de que el propio 'karaoke-ready' de ESE panel (disparado recién cuando termina de
wirear) alcanzara a corregir el estado por otra vía, lo cual no está garantizado que ocurra a
tiempo (o del todo, si esa rama del video no se vuelve a montar).

**Solución:** se agrega un buffer (`pendingPlayCommand`) en el bridge: si llega un
`karaoke-play`/`karaoke-pause` remoto mientras `video` todavía es `null`, se guarda la intención en
vez de descartarla, y se aplica automáticamente apenas `wireVideo()` corre por primera vez — sin
depender del round-trip de `karaoke-ready`. Se extrajo `applyPlayCommand(shouldPlay)` para no
duplicar la lógica de mute-then-play entre el camino normal y el buffer.

**Estado:** corregido (`aframe-overlay-modules.js`). `npm run build` verde. No se pudo reproducir
de punta a punta en navegador en esta sesión por la misma limitación de tab compartida con otra
sesión activa del usuario — pendiente de verificación manual con dos paneles reales.

## 2026-09-14 (continuación) — El buffer solo no alcanzó: dos causas más, encontradas verificando en vivo

**Reporte del usuario:** "no aun no se sincronizan, quedamos en que esto lo manejaria un padre y
cada panel validaria con el" — el fix del buffer (hallazgo anterior) no resolvió el problema.
Se consiguió acceso al navegador compartido y se reprodujo/depuró en vivo con dos paneles reales
(midiendo `_htmlVideo.paused`/`currentTime` directo por JS en cada iframe, no por captura de
pantalla), encontrando DOS causas reales adicionales, ninguna relacionada con el buffer:

**Causa 1 — el reenvío al panel hermano elegía destino por igualdad de referencia de `ev.source`,**
que podía no matchear contra `leftRefs.current.karaoke.current.contentWindow` /
`rightRefs...`. `SyncStereoTestView.jsx` ahora recibe de cada bridge un campo `fromRight` (ya lo
sabe por su propio query string `isRightPanel`) y elige el destino directo por ese dato, sin
comparar objetos `window`.

**Causa 2 (la más esquiva — solo se vio con clicks reales seguidos, no con uno solo):** con
play/pause alternados rápido en cualquiera de los dos paneles, el navegador aborta un
`video.play()` en curso si llega un `pause()` antes de que la promesa resuelva (confirmado en
consola: `AbortError: The play() request was interrupted by a call to pause()`). Cuando eso pasa,
el evento nativo `'play'` NUNCA dispara en ese panel — y como la bandera `suppressNextPlay` (anti-
eco) solo se liberaba DENTRO del listener de ese evento, quedaba trabada en `true` para siempre: el
PRÓXIMO click real del usuario en ese mismo panel dejaba de reenviarse al panel hermano, en
silencio, sin ningún error visible para el usuario. Esto explica por qué el fallo era intermitente
(dependía de qué tan seguido se alternaran los clicks) en vez de reproducirse siempre igual.
Solución: `suppressNextPlay`/`suppressNextPause` ahora se liberan también desde el `catch()` de la
promesa de `play()` (se sabe ahí mismo que el evento no va a disparar) y con un timeout de red de
seguridad de 800ms por si el navegador no llega a rechazar la promesa pero el evento tampoco
dispara por algún otro motivo.

**Verificación en vivo (esta vez sí de punta a punta):** con acceso al navegador compartido, se
click-testeó directamente sobre `#karaoke-btn-play` de cada panel (izquierdo y derecho,
alternando), incluida una ráfaga rápida (150ms entre clicks) diseñada a propósito para forzar la
condición de carrera del `AbortError` — los 7 toggles de la secuencia, incluidos los rápidos,
quedaron sincronizados en ambos paneles (`paused` idéntico en los dos) en cada paso, sin ningún
fallo. Confirmado con medición directa de `_htmlVideo.paused`/`currentTime`, no por inspección
visual.

**Estado:** resuelto y verificado end-to-end en navegador con dos paneles reales, incluida la
condición de carrera de clicks rápidos que había causado el reporte original del usuario.

## 2026-09-14 (continuación) — Seleccionar una canción de la lista no sincronizaba entre paneles

**Pedido del usuario:** "al seleccionar desde la lista de canciones aun no sincronizan, debe
fuincionar como un stop que pare cualquier cancion que este sonsnado y reinicie la seleccionada
desde el comienzo" — hasta este punto el puente de `aframe-overlay-modules.js` solo sincronizaba
play/pause/seek del video YA cargado en cada panel; clickear una canción DISTINTA en la lista de
un panel (`VRKaraokeAf.js`, `activateSelection`/`loadVideo`) solo recreaba el `<video>` de ESE
panel — el hermano seguía con lo que tenía.

**Solución (misma arquitectura "padre fuente de verdad + `fromRight`" que play/pause):** cada
bridge detecta cuándo cambia `karaokeComp._currentSong.fileName` (comparado contra la última
canción que él mismo reportó) y manda `karaoke-song-select` (con `fromRight`) al padre.
`SyncStereoTestView.jsx` guarda `karaokeSongRef` como fuente de verdad, resetea el reloj
compartido a 0 (`karaokeTimeAtRef`/`karaokeTimeSetAtRef`) y reenvía al panel opuesto. El panel que
recibe el mensaje busca el botón de esa canción en su PROPIA lista (por `button._fileName`,
agregado en el fix anterior de esta misma sesión) y le dispara `_activateSelection(...)` — el
mismo mecanismo que ya usa el sistema de gaze/dwell para clickear botones desde afuera — así el
"stop y reinicio desde 0" lo hace el propio `loadVideo()` real del componente, sin duplicar esa
lógica ni tocar `VRKaraokeAf.js`.

**Dos bugs reales encontrados y corregidos DURANTE la verificación en vivo (ninguno se hubiera
visto solo con lectura de código):**

1. **Reloj adelantado durante el countdown local:** `loadVideo(..., { countdown: true })` no
   reproduce al instante — cada panel corre su PROPIO countdown de 3 segundos antes de llamar a
   `video.play()` de verdad. Marcar `karaokePlayingRef.current = true` en el momento de la
   selección (asumiendo que "seleccionar" ya significa "reproduciendo desde ahora") hacía que el
   reloj del padre avanzara DURANTE esos 3 segundos; medido en vivo, los dos paneles terminaban
   ~18 segundos desincronizados entre sí. Corregido: la selección deja el reloj en 0 y
   `karaokePlayingRef.current = false` (fiel al "stop" pedido) — es el evento `'karaoke-play'`
   REAL (el que cada panel dispara solo cuando su propio countdown termina) el que recién ahí
   marca "reproduciendo" con el instante real, mismo mecanismo ya usado y verificado para el botón
   Play.
2. **Orden de mensajes:** el chequeo de "cambió la canción" corría DESPUÉS de `wireVideo()` (que
   manda `'karaoke-ready'`, pidiéndole al padre el estado vigente) — si `'karaoke-ready'` salía
   ANTES que `'karaoke-song-select'`, el padre todavía no sabía del cambio y contestaba con el
   estado de la canción VIEJA, haciendo que el panel volviera a ella brevemente antes de
   corregirse solo en un ciclo posterior (no determinístico). Medido en vivo: el panel que había
   elegido la canción nueva terminaba reproduciéndola pero en el `currentTime` heredado de la
   anterior (~22s) en vez de 0. Corregido invirtiendo el orden: se avisa el cambio de canción
   primero, y recién después se wirea el video/pide `'karaoke-ready'`.

**Verificación en vivo (dos paneles reales, medición directa de `_currentSong.fileName`/
`_htmlVideo.paused`/`currentTime`, no visual):** con una canción sonando en ambos paneles en
sincronía (~8.2s), seleccionar una canción distinta desde el panel derecho cambió AMBOS paneles a
la nueva canción, ambos en pausa y en `currentTime: 0` de inmediato (antes de que corriera el
countdown), y ambos arrancaron a reproducir tras el countdown con una diferencia de 0.02s entre
sí. Repetido en sentido inverso (selección desde el panel izquierdo) con el mismo resultado.

**Estado:** resuelto y verificado end-to-end en navegador con dos paneles reales, en ambos
sentidos (izquierda→derecha y derecha→izquierda), incluida la corrección de los dos bugs de
timing/orden encontrados durante la propia verificación.

## 2026-09-14 (continuación) — Verificación pedida: "el boton play pause tiene delay antirebote"

**Pregunta del usuario** tras el hallazgo del `AbortError` (ver entrada anterior sobre clicks
rápidos): si `#karaoke-btn-play` tenía algún antirebote propio. Se verificó por lectura de código:
**no lo tenía**. El único `COOLDOWN_MS = 600` de toda esta zona pertenece a un sistema DISTINTO
(el gaze/dwell del cursor circular en `aframe-overlay-modules.js`, que protege la activación por
apuntado+espera) — un click/mousedown REAL sobre el botón (directo, o vía el raycast propio de
`VRKaraokeAf.js`, `_setupPointerRaycast`/`handlePointer`) llegaba sin ninguna protección al
`addEventListener('click', ...)` que hace `video.play()`/`pause()`. Esta es precisamente la causa
en el ORIGEN del `AbortError` documentado antes — el fix anterior solo mitigaba el síntoma del
lado receptor (`suppressNextPlay` con timeout de seguridad), no evitaba que el navegador abortara
el `play()` en primer lugar.

**Solución:** se agregó un antirebote de 600ms (`PLAY_TOGGLE_COOLDOWN_MS`, misma duración que el
`COOLDOWN_MS` ya usado en el proyecto para este tipo de protección) directo en el
`addEventListener('click', ...)` de `#karaoke-btn-play` (`VRKaraokeAf.js`) — se reinicia solo con
cada canción nueva (vive dentro de `loadVideo()`, que recrea el botón), así que el primer click
sobre un botón recién creado nunca queda bloqueado por el cooldown de la canción anterior.

**Verificación en vivo:** con el video en pausa, se dispararon 6 clicks reales pegados entre sí
(0.3ms de diferencia total) sobre el botón — resultado: UN solo toggle real (pasó a reproducir),
los otros 5 se ignoraron. Repetido partiendo de "reproduciendo": mismo resultado, un solo toggle.
Confirmado además que el botón sigue respondiendo con normalidad a un click aislado una vez pasado
el cooldown (no queda "trabado").

**Estado:** resuelto y verificado en navegador.

## 2026-09-14 (continuación) — "el play se ve que se activa y desactiva de inmediato y no inicia la cancion"

**Verificación pedida por el usuario:** confirmar primero que el botón en sí (con su antirebote
recién agregado) respondía bien usando el RAYCASTER real, no un `dispatchEvent` directo — se
disparó un `mousedown` real sobre el `<canvas>`, en las coordenadas de pantalla proyectadas desde
la posición 3D real de `#karaoke-btn-play` (mismo cálculo que usa `handlePointer` internamente),
confirmando un toggle limpio y correcto por ese camino. El botón y su antirebote no eran la causa.

**Reproducción real (con dos paneles, midiendo eventos `play`/`pause`/`playing` con marca de
tiempo en ambos videos):** al seleccionar una canción, ambos paneles arrancaban a reproducir
correctamente tras el countdown — pero ~270ms después, AMBOS se pausaban solos, y ~190ms después
volvían a reproducir solos. Justo el patrón descrito por el usuario.

**Causa:** el panel que recibe la orden remota de "reproducir" (`karaoke-play`, ver hallazgos
anteriores) puede arrancar a reproducir (`video.play()`, `paused: false`) ANTES de que su propio
countdown local de 3 segundos siquiera termine — el video queda con `paused: false` pero
`readyState` todavía bajo (recién empezando a bufferear). El código del countdown, al terminar,
comprobaba `readyState` para decidir si llamar `.play()` directo o primero `.load()` — y llamaba
`.load()` sin importar si el video YA estaba reproduciendo. `<video>.load()` reinicia/aborta
cualquier reproducción en curso (comportamiento estándar del elemento, no un bug del navegador) —
eso es la pausa espontánea observada; el `canplay` que sigue relanza el play, de ahí la
recuperación inmediata después.

**Solución:** el countdown ahora comprueba primero si el video YA está reproduciendo
(`!htmlVideo.paused`) antes de decidir llamar `.load()` — si ya está sonando (por la orden
remota que se adelantó), no hace nada, en vez de pisar esa reproducción con un `.load()`.

**Verificación en vivo (repetida tras el fix, misma medición de eventos):** seleccionar una
canción con ambos paneles ya en marcha produjo una transición ÚNICA y limpia a `play`/`playing`
en el instante del countdown (t≈3000ms), sin ningún `pause` espontáneo posterior.

**Hallazgo adicional (NO relacionado con lo anterior, detectado durante esta misma verificación,
sin resolver todavía):** con la reproducción ya estable, se observaron dos pausas+reanudaciones
espontáneas más, sincronizadas entre ambos paneles, con un intervalo de ~9.15s entre sí — no
coincide con ninguna constante de este código (`PLAY_TOGGLE_COOLDOWN_MS`/`COOLDOWN_MS` = 600ms,
`FUSE_MS` = 2500ms, timeout de `applyPlayCommand` = 800ms, countdown = 3000ms). Sospecha (no
confirmada): el sistema de gaze/dwell del cursor circular (`aframe-overlay-modules.js`, reticle
fijo al centro de pantalla) podría estar re-disparando sobre el botón Play si la cámara (que en
este entorno de prueba puede moverse por la otra sesión concurrente compartiendo la misma pestaña,
ver hallazgo de commits inesperados) queda apuntándolo. No reproducido de forma aislada ni
confirmado como causa — queda pendiente de investigación en una sesión sin interferencia de tab
compartida.

**Estado:** el bug reportado por el usuario, resuelto y verificado. El hallazgo adicional del
párrafo anterior queda documentado como pendiente, no confirmado.

## 2026-09-14 (continuación) — Causa real del hallazgo pendiente: el propio sistema de gaze/dwell re-togglea Play/Pause

**Verificación pedida por el usuario:** "debes seleccionar play pause moviendo la camara par apuntar
con ray caster es la forma de detectar el error" — se agregaron logs `[PLAY-DEBUG]` en los tres
puntos relevantes (evento nativo del `<video>`, bridge de sincronización por panel, y el padre) y
el usuario reprodujo el problema moviendo la cámara de verdad (no simulado) y pegó la traza de
consola.

**Causa confirmada por esa traza (no es un bug de sincronización — el reenvío entre paneles
funcionaba bien):** el sistema de gaze/dwell del cursor circular
(`aframe-overlay-modules.js`, reticle fijo al centro de pantalla, dwell de `FUSE_MS`=2500ms) volvía
a activar `#karaoke-btn-play` poco después de que el usuario ya lo hubiera usado. Causa raíz:
`lockedEl` solo evita repetir la activación mientras el reticle sigue apuntando exactamente al
mismo elemento sin interrupción — apenas el raycaster deja de intersectarlo por UN solo tick
(50ms, un micro-movimiento de cámara normal, o simplemente el usuario quedándose mirando el
resultado de su propio click) se limpia el lock, y si el reticle vuelve a caer sobre el MISMO
botón, arranca un fuse completamente nuevo — que se completa y vuelve a togglear el botón sin que
el usuario haya "clickeado" nada nuevo. Para un botón de una sola acción esto ya era una molestia
documentada en Requerimiento 012 ("un click... a veces se veía cancelarse solo"); para un TOGGLE
como Play/Pause es directamente disruptivo: arranca y se detiene solo. Cada panel (izquierdo/
derecho) tiene su PROPIO sistema de dwell independiente — la traza mostró a los dos togglear casi
al mismo instante porque ambas cámaras suelen quedar orientadas de forma similar (mirror), no
porque hubiera coordinación entre ellos.

**Solución:** se agrega un margen de reactivación (`REACTIVATION_GRACE_MS` = 2000ms): si el
reticle vuelve a caer sobre el MISMO elemento que se activó hace menos de ese margen, no arranca
un fuse nuevo (se ignora en silencio, con un log `[PLAY-DEBUG]` que confirma cuándo pasa). Pasado
el margen, se comporta como cualquier otro elemento — sigue siendo posible reactivarlo
deliberadamente, solo que no por quedarse mirando el resultado del click anterior.

**Estado:** corregido (`aframe-overlay-modules.js`). `npm run build`/`npm run check:i18n` verdes.
Pendiente de que el usuario lo reverifique con el mismo método (cámara real + raycaster) que usó
para encontrarlo — los logs `[PLAY-DEBUG]` quedan en el código para esa verificación.

## 2026-09-14 (continuación) — Sigue fallando: "como si recibiera dos clicks instantaneos de ambas vistas"

**Aclaración del usuario tras el fix anterior:** el fix del margen de reactivación (2s) no era la
causa completa. Descripción del usuario: "no funciona el boton play pause, se activa y dessctiva
de inmeditao sin para la cancion, como si el antirebote no funcionara y recibiera dos clicks
instantaneos de ambas vistas" — es decir, no es un RE-disparo sobre el mismo botón con el tiempo
(lo que arregla el margen de reactivación), sino que AMBOS paneles parecen togglear casi al mismo
instante, cada uno por su cuenta.

**Causa (razonada, no reproducida en vivo por la misma limitación de tab compartida):** en modo
Doble panel, cada panel corre su PROPIO sistema de apuntado/dwell (`aframe-overlay-modules.js`,
`tick()`) totalmente independiente del otro — no hay ningún acoplamiento entre ellos más que la
sincronización de CÁMARA (`mouse-look-delta`, que hace que ambas cámaras queden mirando
prácticamente al mismo punto, casi siempre el mismo botón). Si ambos completan su propio dwell casi
al mismo instante (muy probable, justamente porque las cámaras están espejadas) y en ese momento
los dos paneles NO estaban perfectamente sincronizados entre sí (uno reproduciendo, el otro no —
puede pasar por cualquier carrera anterior, por mínima que sea), cada uno decide LOCALMENTE qué
hacer mirando solo su PROPIO `video.paused` — y togglean hacia direcciones opuestas. El reenvío
entre paneles (que funciona bien, ver hallazgos anteriores) entonces le "devuelve" a cada uno el
estado que el OTRO acababa de fijar, produciendo el efecto "se activa y se desactiva solo" descrito
por el usuario. El antirebote existente (`lastPlayToggleAt`) solo se armaba con un CLICK LOCAL —
no protegía contra un cambio de estado que este mismo panel acababa de recibir por SINCRONIZACIÓN
REMOTA (aplicado en el bridge, sin pasar por el botón), así que no frenaba la cascada de
correcciones que sigue al primer desacuerdo.

**Mitigación aplicada:** `lastPlayToggleAt` ahora se arma también dentro de los listeners nativos
'play'/'pause' del `<video>` (disparan por CUALQUIER motivo, local o remoto) — no solo al hacer
click. Esto no evita que las DOS decisiones locales iniciales (si ambos dweels completan en el
mismo tick, antes de que cualquier mensaje haya viajado) puedan seguir divergiendo una vez — pero
sí corta la CASCADA posterior: cualquier click/dwell adicional dentro de los
`PLAY_TOGGLE_COOLDOWN_MS` (600ms) siguientes al último cambio de estado de ESTE panel (por la razón
que sea) se ignora, dándole tiempo a que el reenvío entre paneles (unos pocos ms por postMessage)
termine de asentarse antes de aceptar una nueva decisión local.

**Pregunta arquitectónica abierta, no resuelta en esta pasada:** la causa raíz de fondo es que
"Doble panel" son hoy DOS sesiones interactivas completamente independientes (cada una con su
propio raycaster/dwell/click), no una vista maestra + una espejada — lo que hace posible este tipo
de carrera cada vez que ambas cámaras (espejadas) resultan apuntando al mismo control a la vez. Una
solución de raíz requeriría decidir si el panel SECUNDARIO debería dejar de disparar acciones
LOCALES sobre controles compartidos como Play/Pause (limitarse a reflejar lo que decide el panel
PRIMARIO) — un cambio de diseño, no solo un bugfix, que no se implementó todavía a la espera de
confirmarlo con el usuario.

**Estado:** mitigado, no confirmado como resuelto (no se pudo verificar en vivo por la limitación
de tab compartida). `npm run build`/`npm run check:i18n` verdes. Logs `[PLAY-DEBUG]` siguen
disponibles para que el usuario lo reverifique.

## 2026-09-14 — Flechas de giro reubicadas e invertidas + secciones ocultas seguían siendo clickeables

Tres pedidos encadenados sobre `SyncConfigCompassMenu.jsx`:

1. **"<-" / "->" en las flechas de giro.** Las flechas de rotación pasaron de `◄`/`►` a `<-`/`->`.
   A pedido del usuario, la flecha indica el sentido REAL del giro (no el del símbolo): `<-` rota
   `#compass-wheel` en sentido horario (+1) y `->` en antihorario (−1) — se invirtió el signo que
   pasaba cada una a `rotateWheel()`.

2. **Reubicación junto a la "X".** Las dos flechas estaban afuera de la dona (`RADIUS + 0.45`), en
   los extremos izquierdo/derecho. Se movieron al hueco central junto a la "X": `<-` arriba y `->`
   abajo (eje Z), formando cruz con `+` (izquierda) y `-` (derecha), con el mismo tamaño (0.22×0.22)
   y la misma distancia al centro (`RING_INNER_RADIUS * 0.55`) que `+`/`-`, y mismo `y=0.01`.

3. **Secciones no visibles seguían detectables por el raycaster (hallazgo real).** Con una sección
   abierta (p.ej. Configuración), el mouse/la mirada podían "activar" botones de las otras secciones
   (`Overlays`, `Interfaz`, `Exit`) aunque sus grupos tuvieran `visible=false`, porque el cursor usa
   `raycaster="objects: .clickable"` y el raycaster de A-Frame **no filtra por visibilidad** — lo
   único que define qué es detectable es la clase `.clickable`, que esas secciones conservaban.

   **Solución:** la detectabilidad ahora sigue a la visibilidad quitando/reagregando `.clickable`:
   - Al abrir una sección se desactivan todos los grupos y se activa solo el de la sección elegida;
     al cerrar el panel se desactivan todos.
   - El set original de `.clickable` por grupo se captura UNA vez al cargar (`captureGroupClickables()`)
     y se reusa, para poder reponer la clase sin perder qué elementos eran clickeables.
   - El d-pad de "Interfaz" (`#position-dpad-group`) se gestiona aparte (`setDpadInteractive()`) porque
     su visibilidad depende de si hay un elemento seleccionado, no de la sección completa.
   - El modal de confirmación (`#confirm-panel`) y su botón `login-test` aplican el mismo criterio:
     solo son clickeables mientras el modal está visible.

   **Verificación técnica del mecanismo:** se inspeccionó `aframe.min.js` (1.4.2) del repo — el
   raycaster levanta sus objetos con `refreshObjects()` (`querySelectorAll(".clickable")` +
   `flattenObject3DMaps`) y marca `dirty` ante cambios de DOM vía `MutationObserver`
   (`{childList:true, attributes:true, subtree:true}`) y los eventos `object3dset`/`object3dremove`.
   Como `classList.add/remove('clickable')` es un cambio de atributo en un descendiente de la escena,
   dispara `setDirty` y el próximo tick re-consulta la lista, sacando/reingresando los elementos
   del raycast según corresponda.

   **Estado:** resuelto. Pendiente confirmación manual end-to-end en navegador (abrir Configuración,
   apuntar hacia la zona de las otras secciones y verificar que ya no dispare click/dwell).

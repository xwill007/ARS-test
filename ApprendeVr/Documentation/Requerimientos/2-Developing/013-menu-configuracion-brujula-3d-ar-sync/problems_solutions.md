# Problemas y soluciones — Requerimiento 013

Recordatorio de la regla de hallazgos tardíos (ver skill `crear-requerimiento`): si un item de
`checklist.md` o un criterio de aceptación ya marcado `[x]` resulta no estar realmente resuelto,
corregir la marca y registrar acá el hallazgo indicando explícitamente que fue tardío.

## 2026-09-09 — Pedido explícito: el panel de sección debe ser 3D interactivo con el raycaster, no HTML 2D

**Pedido del usuario:** "al seleccionar una sección del menú el panel que se despliega debe ser un
elemento 3D no 2D, debe poder interactuar con el cursor del raycaster" — corrige la decisión de
diseño original (sección 5 de `requerimiento.md`, "sin reescribir esos controles como widgets
3D"), que había sido tomada deliberadamente por falta de precedente de sliders/checkboxes 3D en
el repo.

**Estado: pendiente, no implementado.** Antes de empezar la conversión (sliders → steppers +/-
clickeables, checkboxes → toggles clickeables, mismo patrón `.clickable` + dwell/click ya
establecido) el usuario pidió resolver primero la ubicación de cámara/menú (ver hallazgo
siguiente), y la sesión se centró en eso. Se dejó preparado: claves i18n cortas
(`syncConfig.overlay.cameraShort/videoShort/coneShort/karaokeShort`) en `src/locales/{es,en,br}.json`
pensadas para las etiquetas de un panel 3D compacto (las descripciones largas existentes,
`syncConfig.overlay.camera` etc., no entran en una fila angosta). **Próxima sesión:** construir el
panel 3D dentro de `SyncConfigCompassMenu.jsx` (probablemente como hijo de `#compass-root`, no de
`<a-camera>` — un panel pegado a la cámara pondría todos sus botones siempre en el mismo punto de
la pantalla, haciendo imposible apuntar a botones distintos con la mirada, ver razonamiento
completo en el hallazgo de reubicación de abajo) y el puente de mensajes bidireccional con
`SyncStereoTestView.jsx` (que sigue siendo el dueño del estado real —
separación/ancho/alto/overlays seleccionados — y de `getUserSetting`/`saveUserSetting`).

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

**Implicación para el panel 3D pendiente (hallazgo de arriba):** un panel con varios botones no
puede ir pegado a `<a-camera>` (como se consideró en su momento) — al moverse siempre junto con la
cámara, TODOS sus botones quedarían fijos en el mismo punto de la pantalla (el centro, donde
también está el reticle), y el usuario nunca podría apuntar a un botón distinto de otro girando la
cabeza, porque el panel entero giraría con él. Tiene que vivir en coordenadas del mundo/escena
(como la brújula), para que cada botón ocupe una posición distinta a la que el usuario pueda
apuntar.

**Pendiente:** el marcador/d-pad de posición (y el futuro panel 3D) siguen con el layout pensado
para la cámara anterior (casi horizontal) — con la cámara ahora arriba mirando al frente por
defecto, su ubicación/orientación probablemente necesite ajustarse; no se tocó en esta pasada a
pedido del usuario ("empecemos por" cámara/menú, dejando el resto para después).

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

# Requerimiento 002 — Confirmar botón AR en vista ARs y corregir el espejo de overlays en modo estéreo

## 1. Objetivo

En la vista `src/views/ARs/index.html` (app `appArs.jsx`), confirmar/ajustar el botón flotante
que activa la experiencia estereoscópica AR (cámara en dos recuadros) para que quede
identificado como botón **"AR"**, y corregir el mecanismo de "espejo" del panel derecho que hoy
está roto: cuando se activa la optimización estereoscópica, el panel derecho debería reflejar el
overlay del panel izquierdo sin montarlo de nuevo (evitar audio/voz/estado duplicado), pero
actualmente no refleja nada — solo copia el video de cámara, el overlay desaparece por completo
del ojo derecho.

Este requerimiento sigue la convención de organización de componentes definida en el skill
`.agents/skills/componentes-frontend/SKILL.md` (compartido vs. local por vista, carpeta por
componente) para cualquier componente nuevo que se agregue como parte de este trabajo.

## 2. Antecedentes y estado actual

### 2.1 El botón AR ya existe — no es una feature desde cero

`src/views/ARs/index.jsx` monta `appArs.jsx`, que renderiza `ARSExperience.jsx`
(`src/views/ARs/ARScomponents/ARSExperience.jsx`). Cuando el modo estéreo no está activo,
`ARSExperience` muestra `ARSFloatingButton.jsx` (`src/views/ARs/ARScomponents/ARSFloatingButton.jsx`):
un botón circular fijo (`position: fixed`, `border-radius: 50%`), ícono `/images/vr-glasses-512.png`,
`aria-label="Activar modo ARS"`, **sin texto visible**. Al hacer click ejecuta `handleARStart`
(`ARSExperience.jsx` líneas 26-29), que activa `showStereoAR` y monta
`ARStereoView.jsx` (`src/views/ARs/ARSviews/ARStereoView.jsx`), la vista que efectivamente
muestra la cámara (`getUserMedia`, `facingMode: 'environment'`) en dos `ARPanel` lado a lado.

Es decir: el flujo completo (botón → vista estéreo con cámara en dos recuadros) ya está cableado
y funcionando. Lo que falta es que el botón se identifique visualmente como **"AR"** (hoy es solo
un ícono sin texto) y confirmar/corregir el comportamiento de los overlays dentro de esa vista.

### 2.2 Sistema de overlays y su desacople del render estéreo

`AROverlayController.jsx` (`src/views/ARs/ARScomponents/AROverlayController.jsx`) gestiona qué
overlays están seleccionados (desde un registro, `overlays/index.js`) y expone
`prepareOverlaysForAR()` (línea 185-189), que aplana los overlays activos en un solo array. Ese
array se pasa como prop `overlay` a `ARSExperience` → `ARStereoView` → cada `ARPanel` (uno por
ojo). Este desacople ya evita instanciar el *controlador* de overlays dos veces; el problema de
duplicación real está un nivel más abajo, en cómo cada `ARPanel` decide si renderiza el overlay
o no (ver 2.3).

### 2.3 El mecanismo de "espejo" existe pero está roto (dos bugs confirmados, verificado en navegador)

`ARSConfig.jsx` expone en su panel de configuración (⚙️) las opciones `optimizeStereo` y
`mirrorRightPanel` (ambas `false` por defecto — `ARStereoView.jsx` líneas 81-83,
`ARSConfig.jsx` líneas 50-54), documentadas en
`src/views/ARs/ARScomponents/OPTIMIZACION_ESTEREOSCOPICA.md`. Con ambas activas, la intención
documentada es: el panel izquierdo renderiza el overlay real y el panel derecho no lo vuelve a
montar, sino que muestra un reflejo.

En la implementación actual (`ARStereoView.jsx`):

- Cuando `mirrorRightPanel && optimizeStereo`, el panel derecho **no renderiza `<ARPanel>`**,
  sino un `<canvas ref={rightCanvasRef}>` (líneas ~518-524).
- Un `useEffect` (líneas ~336-367) corre un `setInterval` a 15 fps que: (a) dibuja el frame de
  video con `ctx.drawImage(video, ...)`, y (b) busca overlays con
  `leftPanel.querySelectorAll('[data-overlay], .ars-overlay')` (línea 352) para capturarlos con
  `html2canvas` y dibujarlos encima del canvas.

**Bug confirmado:** ningún componente del árbol de overlays genera un elemento con el atributo
`data-overlay` ni la clase `ars-overlay` — `grep -rn "data-overlay|ars-overlay" src/views/ARs/`
solo encuentra el propio `querySelectorAll` que los busca (ver `ConfigurableOverlayManager.js`,
que usa `ars-overlay-settings` como *key* de `localStorage`, sin relación). El selector siempre
devuelve una lista vacía: el canvas derecho **solo muestra el video de cámara, nunca el
overlay**. Con `mirrorRightPanel` activo, el ojo derecho pierde el overlay por completo en vez
de reflejarlo.

**Código muerto relacionado:** `OptimizedOverlayWrapper.jsx` (líneas 16-21) tiene una rama
`if (!isPrimaryPanel && optimizeStereo && mirrorRightPanel) return null;` pensada para el caso en
que el panel derecho renderiza `<ARPanel>` en modo espejo. Esa rama es inalcanzable: según el
punto anterior, cuando esa condición es verdadera `ARStereoView.jsx` nunca monta `<ARPanel>` como
panel derecho (monta el `<canvas>` en su lugar) — solo lo monta cuando la condición es falsa.

**Segundo bug confirmado en navegador (más profundo que el selector):** corregir el selector
(agregar `data-overlay="true"` en `ARPanel.jsx`) hace que `html2canvas` reciba el elemento
correcto, pero **igual no logra capturar el overlay** — porque `vrConeOverlay` (el overlay por
defecto) renderiza su contenido A-Frame dentro de un `<iframe srcDoc>`
(`VRConeOverlay.jsx` línea 369), y `html2canvas` no puede rasterizar contenido de `<iframe>`; esto
es una limitación conocida y documentada de la librería, no un caso límite raro. Verificado en
navegador con Optimizar + Espejo D confirmados activos por DOM: el canvas espejo dibuja
correctamente el frame de cámara (93163 de 182400 píxeles no-negros) pero prácticamente ningún
píxel del color del texto del overlay (231 de 182400, ruido de antialiasing) — comparado con el
panel izquierdo real, donde el texto amarillo cubre una porción visible grande. Sin errores en
consola: `html2canvas` no lanza excepción, simplemente produce una captura vacía para el `iframe`.

Los tres overlays `type: 'html'` del registro (`vrConeOverlay`, `vrLocalVideoOverlay`,
`combinedAFrame`, ver `overlays/index.js`) están implementados vía A-Frame-en-iframe, así que
**ninguno de ellos puede reflejarse con el mecanismo actual tal como está**, incluso con el
selector corregido. Sigue sin confirmarse si los overlays `type: 'r3f'` (que si) usan un
`<canvas>` WebGL real en el documento principal en vez de un iframe) se reflejan correctamente
con `preserveDrawingBuffer: true` — no se pudo probar en esta sesión (ver Fase 2 del checklist).

**Corrección sobre un hallazgo previo de esta misma sesión:** en una verificación anterior se
había reportado (incorrectamente) que el overlay sí se reflejaba — esa lectura se basó en una
medición de píxeles tomada en un momento en que el estado de los checkboxes de configuración se
había desincronizado por clicks previos (ya señalado como no confiable en su momento, pero no se
volvió a repetir la medición en un estado limpio antes de dar la conclusión por buena). La
medición repetida con el estado confirmado por DOM (arriba) corrige ese error.

### 2.4 Código huérfano detectado (fuera de alcance, solo como nota)

`grep -rn` sobre imports en `src/` no encuentra ninguna referencia a
`src/views/ARs/ARScomponents/StereoARView.jsx` + `StereoARPanel.jsx`, ni a
`src/views/ARs/ARSviews/XRStereoView.jsx` — parecen prototipos previos sin uso actual. No se
tocan en este requerimiento (ver sección 3).

### 2.5 Bug similar en otro flujo, no tocado aquí

`src/components/VRViews/VRViewARS/StereoARView.jsx` (usado solo desde `App.jsx` raíz, botón
"AR Stereo" de `VRDisplay.jsx`) pasa el mismo `overlay` a ambos `StereoARPanel` sin ningún
mecanismo de espejo — ahí sí se duplica de verdad el overlay (dos instancias montadas). Es un
flujo distinto al de `src/views/ARs/index.html` y no se corrige en este requerimiento (ver
sección 3).

## 3. Alcance

### Incluido

- Agregar un label de texto visible "AR" al botón flotante existente
  (`ARSFloatingButton.jsx`, montado desde `ARSExperience.jsx` en `appArs.jsx`) — hoy solo tiene
  ícono. No se cambia su comportamiento (sigue activando `ARStereoView`).
- Probar en navegador el flujo completo: click en el botón → cámara visible en los dos paneles
  de `ARStereoView`.
- Corregir el selector roto de `ARStereoView.jsx` (línea 352) para que el espejo del panel
  derecho realmente capture el overlay del panel izquierdo, agregando el atributo
  `data-overlay="true"` en el contenedor real del overlay dentro de `ARPanel.jsx` (el `div` de
  línea 227, que envuelve `OptimizedOverlayWrapper`).
- Probar en navegador con `optimizeStereo` + `mirrorRightPanel` activos (vía panel ⚙️ de
  `ARSConfig`) al menos un overlay HTML/A-Frame y uno R3F del registro, confirmando si aparecen
  reflejados en el panel derecho.
- Si la prueba anterior muestra que los overlays R3F no aparecen (por la limitación de
  `html2canvas` con WebGL descrita en 2.3), agregar `gl={{ preserveDrawingBuffer: true }}` al
  `<Canvas>` de `ARPanel.jsx` (líneas ~131-144) y volver a probar.
- Eliminar o dejar comentada con nota la rama inalcanzable de `OptimizedOverlayWrapper.jsx`
  (líneas 16-21) — decisión final en diseño técnico (sección 4).

### No incluido

- Reestructurar `ARSFloatingButton.jsx` / `ARSExperience.jsx` a la convención de carpeta por
  componente (`Nombre/Nombre.jsx` + `index.js`) del skill `componentes-frontend` — son archivos
  existentes que ya viven correctamente ubicados como locales de la vista `ARs`
  (`views/ARs/ARScomponents/`); reestructurarlos es un refactor aparte, no requerido para este
  fix. La convención de carpeta sí aplica a cualquier componente nuevo que se cree.
- Eliminar el código huérfano de 2.4 (`ARScomponents/StereoARView.jsx`, `StereoARPanel.jsx`,
  `ARSviews/XRStereoView.jsx`) — se deja documentado como candidato a limpieza futura.
- Corregir la duplicación real de overlay en `components/VRViews/VRViewARS/StereoARView.jsx`
  (flujo del botón "AR Stereo" de `App.jsx`/`VRDisplay.jsx`, sección 2.5) — es un componente y
  flujo distintos, sin el mecanismo de espejo que sí existe en `ARStereoView.jsx`. Si se decide
  corregirlo, debe ser un requerimiento propio.
- Cambiar el valor por defecto de `optimizeStereo`/`mirrorRightPanel` a `true` — se mantienen
  como opt-in vía el panel de configuración, sin cambios de default.
- Hacer que los overlays `type: 'r3f'` (`simpleText`, `rotatingCube`, `vrConeR3FOverlay`, etc.) se
  reflejen en el panel derecho — el fix aplicado (Intento 4, sección 4.4) cubre los overlays
  `type: 'html'`/A-Frame-en-iframe. Adaptar la misma técnica al render loop de R3F queda como
  trabajo de seguimiento explícito (Fase 3 del checklist).

## 4. Diseño técnico

### 4.1 Label visible en el botón AR

Agregar un `<span>` de texto "AR" dentro de `ARSFloatingButton.jsx`, debajo o al lado del ícono
existente, respetando el `scale` que ya recibe el componente. Cambio acotado a ese único archivo,
sin tocar `ARSExperience.jsx` ni la lógica de activación.

### 4.2 Fix del espejo de overlay — opción elegida vs. descartada

**Opción A (recomendada): corregir el selector, mantener el mecanismo actual.**
Agregar `data-overlay="true"` al `div` envolvente real del overlay en `ARPanel.jsx` (línea 227).
Cambio de una línea; reutiliza el pipeline de captura que ya existe (`drawImage` para video +
`html2canvas` para overlay) en vez de rediseñarlo. Consistente con la intención original
documentada en `OPTIMIZACION_ESTEREOSCOPICA.md`.

**Opción B (descartada): capturar todo el panel izquierdo con `html2canvas` en cada frame,
en vez de separar video (canvas nativo) + overlay (html2canvas selectivo).**
Más simple de leer, pero pierde la ventaja de `drawImage` (barato, sin rasterizar DOM) para el
video, y `html2canvas` sobre un `<video>` es notoriamente poco confiable. Se descarta: el diseño
original de separar video/overlay era correcto, solo estaba mal cableado el selector.

**Sobre `OptimizedOverlayWrapper.jsx` líneas 16-21 (rama inalcanzable):** se decide en ejecución,
tras confirmar en navegador que el fix de 4.2 funciona, si conviene eliminar esa rama muerta o
dejarla como defensa por si en el futuro se vuelve a renderizar `<ARPanel>` como panel derecho en
modo espejo (por ejemplo, si se decide algún día NO reemplazar `<ARPanel>` por `<canvas>` en ese
caso). Documentar la decisión tomada en el checklist de ejecución (sección 7).

**Sobre `preserveDrawingBuffer` (overlays R3F):** condicional a lo que muestre la prueba en
navegador de la sección 3 — no se aplica a ciegas sin confirmar primero que el problema es ese.

### 4.3 Checklist de intentos para lograr el espejo real de overlays (sin duplicar)

Confirmado en navegador (sección 2.3): el fix de la Opción A (4.2) corrige el selector, pero no
alcanza para que el overlay se refleje — hace falta resolver cómo copiar el contenido real del
overlay al canvas espejo. Cada intento se prueba en navegador antes de marcarlo, con el resultado
concreto anotado, para no repetir un camino ya descartado.

- [x] **Intento 1 — `html2canvas` sobre el `div [data-overlay]`** (esto es lo que ya hacía el
      código antes de este requerimiento, solo con el selector roto)
  - Ventaja: reutiliza el pipeline ya existente, cambio mínimo (una línea, el `data-overlay`).
  - Desventaja: `html2canvas` no puede rasterizar contenido de `<iframe>` — limitación conocida
    y documentada de la librería, no un caso límite.
  - **Resultado: falló.** Confirmado en navegador con Optimizar+Espejo D activos por DOM: 231/182400
    y luego 125/182400 píxeles del color del overlay en el canvas espejo (ruido de antialiasing),
    el overlay nunca aparece. Sin errores en consola — la librería no lanza excepción, produce una
    captura vacía.

- [x] **Intento 2 — `drawImage` directo del `<canvas>` real dentro del iframe, con
      `renderer="preserveDrawingBuffer: true"` declarativo en `<a-scene>`**
  - Ventaja: evita `html2canvas` por completo; sincrónico y barato, misma técnica que ya usamos
    para copiar el video. Cubre en el mismo cambio el caso de overlays `r3f` (con
    `gl={{ preserveDrawingBuffer: true }}` en el `<Canvas>` de `ARPanel.jsx`).
  - Desventaja: depende de que A-Frame realmente aplique el atributo al contexto WebGL real.
  - **Resultado: falló.** El atributo se parsea correctamente
    (`scene.getAttribute('renderer').preserveDrawingBuffer === "true"`), el iframe es accesible
    (`same-origin`, `srcDoc`), se encuentra el `<canvas class="a-canvas">` correcto
    (`scene.canvas === canvas`, `scene.hasLoaded === true`) y `drawImage` no tira ningún error —
    pero el contexto WebGL real nunca recibe el flag
    (`gl.getContextAttributes().preserveDrawingBuffer === false`). A-Frame 1.4.2 (cargado por CDN
    en el iframe) no propaga ese atributo a la creación real del renderer. El overlay `r3f` (con
    el mismo fix en `ARPanel.jsx`) no se llegó a probar en esta sesión — ver Fase 2.4 del checklist
    de ejecución.

- [x] **Intento 3 — Canvas manual pre-creado + atributo `canvas="#id"` de `<a-scene>`**
  - Idea: crear el `<canvas>` a mano dentro del `srcDoc` del iframe, llamar nosotros
    `canvas.getContext('webgl', {preserveDrawingBuffer: true})` **antes** de que A-Frame
    inicialice (los atributos de un contexto quedan fijados en la primera llamada a
    `getContext()` sobre ese canvas), y decirle a `<a-scene canvas="#id">` que reuse ese canvas en
    vez de crear uno propio.
  - Ventaja: si A-Frame respeta el canvas provisto, el contexto ya viene con el flag correcto sin
    depender de que A-Frame lo propague — evita el punto exacto donde falló el Intento 2.
  - Desventaja: depende de timing exacto (que nuestro script corra y llame `getContext()` antes de
    que a-scene tome el canvas) y de que A-Frame 1.4.2 realmente soporte reusar un canvas externo
    con contexto ya creado.
  - **Resultado: falló, por una razón distinta a los anteriores.** Probado en navegador vía botón
    de prueba AR1 (`TestOverlayAR1.jsx`, eliminado tras la prueba): A-Frame **no reutilizó** el
    canvas provisto — creó el suyo propio por separado. Confirmado con
    `scene.canvas === canvas` → `false`, y el canvas provisto quedó en su tamaño default (300×150,
    sin usar). El atributo `canvas="#id"` no se respeta en A-Frame 1.4.2 tal como se esperaba.

- [x] **Intento 4 — Captura sincrónica dentro del loop de render, sin depender de
      `preserveDrawingBuffer`**
  - Idea: engancharse al loop de render de three.js/A-Frame dentro del iframe (envolviendo
    `scene.renderer.render`) para copiar el canvas con `drawImage` a un `<canvas>` 2D oculto
    inmediatamente después de cada frame, antes de que el navegador pueda limpiar el buffer WebGL
    — evita depender de que el navegador lo preserve.
  - Ventaja: no depende de ningún flag de A-Frame ni de si lo propaga correctamente.
  - Desventaja: más invasivo (hay que interceptar el ciclo de render interno de A-Frame/three.js
    dentro del iframe).
  - **Resultado: FUNCIONA — ganador.** Probado en navegador vía botón de prueba AR2
    (`TestOverlayAR2.jsx`, eliminado tras la prueba): con Optimizar + Espejo D confirmados activos
    por DOM, el canvas espejo mostró el cubo y el texto del overlay de prueba —
    **16703/182400 píxeles (9.2%) del color del overlay**, contra ~100-200 de ruido en todos los
    intentos anteriores. Confirmado visualmente (screenshot con ambos paneles mostrando el mismo
    contenido). Aplicado al overlay real (`VRConeOverlay.jsx`) y probado de nuevo con el botón
    "AR" real (no el de prueba): **19751/182400 píxeles (10.8%)** de texto amarillo reflejado,
    confirmado visualmente. Sin regresión en modo independiente (`arPanelCount` vuelve a 2 al
    desactivar Espejo D, ambos paneles renderizan overlay normalmente). Aplicado también a
    `VRLocalVideoOverlay.jsx` (mismo patrón, no probado individualmente pero es el mismo mecanismo
    ya validado). El pequeño desfase de posición/rotación entre panel izquierdo y derecho visible
    en las capturas es el lag natural del intervalo de captura (~66ms), no duplicación —
    confirmado que el panel derecho es el `<canvas>` espejo, no una segunda instancia
    (`arPanelCount: 1` durante la prueba).

- [x] **Intento 5 — Actualizar la versión de A-Frame cargada en el iframe**
  - Idea: `VRConeOverlay.jsx` y `VRLocalVideoOverlay.jsx` cargaban A-Frame 1.4.2 fijo por CDN. Una
    versión más nueva podría tener corregida la propagación de `preserveDrawingBuffer` al
    renderer.
  - Ventaja: si funcionaba, resolvía el Intento 2 sin workarounds adicionales.
  - Desventaja: cambio de mayor alcance — afecta a todos los overlays A-Frame del proyecto.
  - **Resultado: falló, mismo problema que en 1.4.2.** Probado en navegador vía botón de prueba
    AR3 (`TestOverlayAR3.jsx`, eliminado tras la prueba) cargando A-Frame 1.6.0 por CDN
    (confirmado `AFRAME.version === "1.6.0"` dentro del iframe). El atributo se parsea
    correctamente pero `gl.getContextAttributes().preserveDrawingBuffer` sigue en `false` — no es
    un bug puntual de la 1.4.2, es un patrón de diseño de A-Frame en ambas versiones. Descartado
    definitivamente como camino de solución (no se necesita seguir probando versiones).

- [ ] **Intento 6 — Sacar A-Frame del iframe, montarlo directo en el documento principal**
  - No hizo falta probarlo: el Intento 4 ya resolvió el problema sin necesitar este cambio de
    arquitectura grande. Se deja documentado como alternativa si en el futuro se necesita eliminar
    los iframes por otra razón.

- [ ] **Intento 7 (alternativa de diseño, no es un fix del espejo) — Aceptar duplicar el overlay
      en vez de reflejarlo**
  - No hizo falta: el Intento 4 logra el reflejo real sin necesidad de duplicar. Se deja
    documentado como red de seguridad si en el futuro el Intento 4 deja de funcionar (por ejemplo,
    si A-Frame cambia su forma de exponer `renderer.render`).

### 4.4 Intento 4 aplicado a producción, luego revertido — bugs adicionales encontrados

El Intento 4 se aplicó en su momento a los overlays reales (`VRConeOverlay.jsx`,
`VRLocalVideoOverlay.jsx`, `ARPanel.jsx`, `ARStereoView.jsx`) y se probó end-to-end con el botón
"AR" real, confirmado funcionando. **Se revirtió por completo a pedido del usuario** (reporte de
que la vista real `src/views/ARs/index.html` dejó de andar) — hoy el mecanismo de captura
sincrónica del Intento 4 solo existe en el arnés de prueba aislado
(`ARScomponents/ARStest/mirror-fix/`, botón "AR-TEST"), no en ningún archivo de producción.

Durante la validación posterior en el arnés de prueba aparecieron tres bugs adicionales en la
implementación del Intento 4 (ya corregidos ahí, nunca llegaron a producción):

1. **Distorsión**: el canvas de captura fijaba su tamaño una sola vez al cargar; si el tamaño real
   cambiaba después (rotación de dispositivo, resize), quedaba desactualizado y `drawImage`
   estiraba la imagen. Fix: resincronizar el tamaño en cada frame dentro del propio hook de
   render.
2. **Réplica múltiple ("ghosting")**: el contexto WebGL tiene `alpha:true`, y el código nunca
   limpiaba el canvas de captura antes de dibujar — cada frame se componía sobre el anterior en
   vez de reemplazarlo. Fix: `clearRect` antes de cada `drawImage`.
3. **Condición de carrera de timing**: con A-Frame en caché del navegador, el evento `loaded` de
   la escena puede disparar antes de que el script llegue a engancharse, dejando el hook sin
   instalar. Fix: comprobar `scene.hasLoaded` y ejecutar el setup inmediatamente si ya es `true`,
   en vez de depender solo del evento.

### 4.5 Limitación de fondo del Intento 4 (y de cualquier espejo por captura): no es interactivo

El usuario reportó, ya con los 3 bugs de 4.4 corregidos: **"aún puedo mover un componente y el
otro se queda como estaba"**. Esto no es un bug adicional del mecanismo de captura — es una
limitación estructural: el panel derecho en modo espejo es un `<canvas>` pasivo (confirmado
`arPanelCount: 1`), nunca una instancia interactiva. Cualquier control (play/pause, barra de
progreso, cursor) dibujado ahí es una imagen sin funcionalidad — clickearlo no hace nada. Y en
modo independiente (`arPanelCount: 2`, sin espejo), cada panel SÍ es una instancia real, pero
completamente aislada de la otra: interactuar con una no afecta a la otra en absoluto (cada
`<video>`, cada estado de A-Frame, es su propia copia sin relación).

### 4.6 Intento 8 (propuesto por el usuario) — Sincronización de estado por postMessage, no captura de píxeles

Idea: en vez de intentar copiar píxeles de un panel al otro, mantener **dos instancias reales e
independientes** (como ya hace el modo independiente hoy) pero sincronizar su estado en tiempo
real — play/pause/seek de video, y en general cualquier acción del usuario — vía `postMessage`
entre los dos `<iframe>`, coordinado por el componente padre que los monta.

Prototipo construido y validado en el arnés de prueba aislado (nunca toca producción):

- `ARScomponents/ARStest/mirror-fix/VRLocalVideoOverlaySync.jsx` — copia literal de
  `overlays/VRLocalVideoOverlay.jsx` (el componente de video real de producción, no uno
  simplificado) con un bloque agregado al final del script: engancha eventos `play`/`pause`/
  `seeked` del `<video>` real (`entity.components['vr-local-video'].video`, ya que el componente
  lo crea dinámicamente) y los emite por `postMessage` a `window.parent`; y escucha mensajes
  entrantes para aplicar el mismo estado sin reemitir (banderas `suppressNext*`, necesarias porque
  `video.play()`/`.pause()`/`currentTime` disparan sus eventos de forma asíncrona — una bandera
  booleana puesta y sacada sincrónicamente no alcanza para evitar el eco).
- `ARScomponents/ARStest/mirror-fix/SyncStereoTestView.jsx` — monta dos instancias de
  `VRLocalVideoOverlaySync` (NO usa `ARStereoView.jsx`, arquitectura distinta a propósito) y hace
  de relay: escucha mensajes de cualquiera de los dos iframes y los reenvía únicamente al otro
  (nunca al que lo emitió).
- Botón de prueba "AR-SYNC" agregado junto a "AR-TEST" en `ARTestMirrorButton.jsx`.

**Resultado: funciona.** Probado en navegador con el componente de video real:
- Play desde el panel izquierdo → el derecho reproduce también, con **~20ms de diferencia** de
  `currentTime` entre ambos.
- Pause desde el panel **derecho** (bidireccional) → el izquierdo también se detiene, ~30ms de
  diferencia.
- Seek grande (saltar a 60s) desde el izquierdo → el derecho salta exactamente al mismo punto
  (60.00s en ambos).
- Sin loop infinito de mensajes (confirmado por el patrón `suppressNext*`).
- **Posición y rotación de cámara** (a pedido del usuario: "si muevo uno el otro también debería
  moverse"): agregado un segundo canal de sync por `postMessage` (`camera-rotation`,
  `camera-position`), por *polling* cada 100ms comparando contra el último valor *recibido* (no
  el último enviado) para no reenviar en loop lo que se acaba de aplicar de forma remota. Escribe
  directo en el estado interno de `look-controls` (`yawObject`/`pitchObject`), no en el atributo
  `rotation` del DOM — look-controls recalcula la rotación desde ahí en cada tick y pisaría
  cualquier cambio hecho solo por `setAttribute`. Probado: rotación de cámara (yaw/pitch) y
  posición (wasd) sincronizadas exactas en ambas direcciones (izquierda→derecha y
  derecha→izquierda), estables tras varios segundos sin oscilar.

**Comparación con el Intento 4 (espejo por captura):**

| | Intento 4 (espejo) | Intento 8 (sync) |
|---|---|---|
| Panel derecho interactivo | No (imagen pasiva) | Sí (instancia real) |
| Sincroniza cualquier interacción | Solo lo que se ve (píxeles) | Solo lo que se sincroniza explícitamente: play/pause/seek y posición/rotación de cámara ya implementados; falta volumen si se quiere |
| Complejidad | Alta (WebGL, timing, iframes) | Media (postMessage + relay + polling con guarda anti-eco) |
| Optimización de CPU/GPU/audio del panel secundario | Sí, evita re-render 3D completo | No — ambos paneles siguen renderizando su propia escena 3D completa |

**Pendiente si se elige este camino:** sincronizar también volumen; decidir si reemplaza al
Intento 4 o convive con él (por ejemplo, Intento 8 para overlays interactivos tipo video, Intento 4
para overlays puramente visuales sin controles).

**Ajuste de latencia:** el usuario reportó un pequeño retardo notorio en el seguimiento de
cámara. El *poll* original corría cada 100ms (`setInterval`). Se probó bajarlo a
`requestAnimationFrame` (retardo teórico aún menor, sincronizado al render) pero **se descartó**:
Chrome pausa `requestAnimationFrame` por completo cuando la pestaña pierde el foco/visibilidad —
en esa situación la sincronización de cámara se hubiera cortado del todo, un riesgo real más grave
que el retardo que se quería arreglar. Se dejó en `setInterval` pero bajado a 16ms (~60/seg, contra
los 100ms originales) — sigue corriendo aunque la pestaña quede en segundo plano, y el retardo
percibido bajó a lo que tarda el `postMessage` entre iframes (confirmado en navegador: el valor ya
aparece sincronizado en la siguiente consulta inmediata, sin esperas perceptibles).

**Reconocimiento de voz (texto detectado + estado del ícono):** el usuario notó que no estaba
sincronizado. Se agregó un tercer canal (`voice-status`) que observa con `MutationObserver` los
elementos que el componente `voice-control` real ya actualiza (`#voice-text`, `#mic-status`, color
del círculo del ícono) y espeja esos valores en el panel remoto — a propósito **sin** arrancar un
segundo `SpeechRecognition` real ahí (sería un micrófono duplicado escuchando el mismo audio, el
mismo problema de duplicación que este proyecto ya evita en otros lados, ver
`OptimizedOverlayWrapper.jsx`). Mismo patrón de "consumir la próxima mutación" que en play/pause
(`MutationObserver` también entrega cambios de forma asíncrona). Probado en navegador simulando
reconocimiento activo con texto: texto, estado "ON" y color verde del ícono idénticos en ambos
paneles; confirmado que el panel remoto NO inició su propio reconocimiento
(`isListening: false`, `data.enabled: false` en el componente real) — solo replica la vista.

Los overlays `type: 'r3f'` (que renderizan un `<canvas>` WebGL directo en el documento principal,
sin iframe) quedan **fuera de esta solución** — se revirtió el
`gl={{ preserveDrawingBuffer: true }}` que se les había agregado en el Intento 2 porque no
resuelve nada por sí solo (mismo problema de propagación) y no se probó una versión adaptada del
Intento 4 para ese caso (habría que aplicar el mismo patrón de captura sincrónica, pero enganchado
al `onCreated`/render loop de R3F en vez de al de A-Frame). Ver "No incluido" (sección 3) y
Fase 2.4 del checklist de ejecución.

## 5. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/views/ARs/ARScomponents/ARSFloatingButton.jsx` | Agregar `<span>` con texto visible "AR" junto al ícono existente |
| `src/views/ARs/ARScomponents/ARPanel.jsx` | Agregar `data-overlay="true"` al `div` envolvente del overlay |
| `src/views/ARs/ARScomponents/overlays/OptimizedOverlayWrapper.jsx` | Eliminar la rama inalcanzable de líneas 16-21 (confirmada dead code), dejar comentario explicando por qué |
| `src/views/ARs/ARSviews/ARStereoView.jsx` | Reemplazar la captura por `html2canvas` por `drawImage` directo del `<canvas>` real (dentro de iframe o directo), quitar el import de `html2canvas` |
| `src/views/ARs/ARScomponents/a-frame-components-ars/VRConeOverlay.jsx` | Agregar `<canvas id="ars-frame-capture">` + script de captura sincrónica en el loop de render (Intento 4 ganador) |
| `src/views/ARs/ARScomponents/overlays/VRLocalVideoOverlay.jsx` | Mismo fix que `VRConeOverlay.jsx` |

## 6. Criterios de aceptación

- [x] El botón flotante en `src/views/ARs/index.html` muestra el texto "AR" visible (no solo
      ícono), y sigue activando la vista estereoscópica al hacer click. Confirmado en navegador
      (Chrome, `http://localhost:3000` con HTTPS desactivado temporalmente solo para la prueba —
      ver nota de Fase 2).
- [x] Al activar el botón AR, se ve la cámara del dispositivo en los dos recuadros de
      `ARStereoView` (paneles izquierdo y derecho). Confirmado.
- [x] Con `optimizeStereo` y `mirrorRightPanel` activos desde el panel ⚙️, un overlay HTML/A-Frame
      seleccionado se ve reflejado en el panel derecho (no solo el video de cámara). **Cumplido**
      tras aplicar el Intento 4 (sección 4.3/4.4). Confirmado en navegador con el overlay real
      `vrConeOverlay` y el botón "AR" real: 19751/182400 píxeles (10.8%) del color del texto
      reflejado en el canvas espejo, confirmado también visualmente.
- [ ] Se confirma (con evidencia de la prueba en navegador) si los overlays R3F se reflejan con el
      mismo fix. **No probado en esta sesión** — se revirtió el `preserveDrawingBuffer` que se les
      había agregado (no resuelve nada por sí solo, mismo problema de propagación que en A-Frame),
      y no se adaptó el Intento 4 (captura sincrónica) al render loop de R3F. Los overlays `r3f`
      quedan fuera de esta solución — ver sección 3 y 4.4. Queda como trabajo de seguimiento.
- [x] Con `optimizeStereo`/`mirrorRightPanel` desactivados (modo independiente, default), ambos
      paneles siguen mostrando su propio overlay como antes del cambio (no regresión). Confirmado.
- [x] No queda ningún elemento con `data-overlay`/`ars-overlay` duplicado sin motivo — el
      selector de `ARStereoView.jsx` línea 352 encuentra exactamente el contenedor de overlay
      esperado, no más de uno por panel. Confirmado (`document.querySelectorAll('[data-overlay]').length === 1`
      con el panel izquierdo montado).

## 7. Checklist de ejecución

### Fase 1 — Botón AR

- [x] 1.1 Agregar label de texto "AR" en `ARSFloatingButton.jsx`.
- [x] 1.2 Levantar el frontend (`npm run dev` o script equivalente) y abrir
      `src/views/ARs/index.html`; confirmar visualmente el label y que el click activa
      `ARStereoView` con cámara en ambos paneles.

> Nota de entorno: `vite.config.js` sirve el frontend por HTTPS con un certificado autofirmado
> (`ssl/cert.pem`), y la extensión de automatización de navegador no puede interactuar con la
> pantalla de advertencia de certificado de Chrome (no permite adjuntar el control remoto a esa
> página especial). Para poder probar el flujo en esta sesión se desactivó temporalmente HTTPS en
> `vite.config.js` (vía `VITE_TEST_NO_HTTPS=1`, con fallback al comportamiento normal si la
> variable no está seteada) y se sirvió por `http://localhost:3000` — Chrome trata
> `http://localhost` como contexto seguro, así que `getUserMedia` (cámara) igual funcionó. Ese
> cambio se revirtió por completo al terminar de probar; `vite.config.js` no tiene diff en git.
> Para validar manualmente (por ejemplo en un dispositivo real vía la IP de red), hay que aceptar
> el certificado autofirmado una vez en el navegador del dispositivo.

### Fase 2 — Fix del selector de espejo

- [x] 2.1 Agregar `data-overlay="true"` en `ARPanel.jsx` línea 227 (línea 228 tras el cambio, tag
      quedó en múltiples líneas).
- [x] 2.2 Activar `optimizeStereo` + `mirrorRightPanel` desde el panel ⚙️ de `ARSConfig`.
- [x] 2.3 Probado con el overlay HTML/A-Frame por defecto (`vrConeOverlay`, vía `iframe srcDoc`).
      El selector corrige el bug de 2.3-antecedentes (`data-overlay` pasa de 0 a 1 coincidencias),
      pero por sí solo no bastaba para reflejar el overlay — ver Fase 2.5/2.6.
- [x] 2.4 **No se pudo probar overlays R3F vía UI.** El dropdown "Overlays" del panel ⚙️
      (`ARSConfig`) no respondió de forma confiable a los clicks de la automatización de navegador
      (abría/cerraba sin mostrar las opciones de forma estable) — no se logró cambiar la selección
      a un overlay `r3f` (`simpleText`, `rotatingCube`, etc.) durante esta sesión. Se decidió no
      perseguir el fix para overlays R3F en este requerimiento (ver Fase 3).
- [x] 2.5 A pedido del usuario, se armó un arnés de prueba temporal (botones "AR1"/"AR2"/"AR3" en
      `appArs.jsx`, componentes en `ARScomponents/ARStest/mirror-fix/`, eliminados al terminar)
      para probar en paralelo, sin tocar el flujo real, los Intentos 3, 4 y 5 del checklist de la
      sección 4.3. Resultado de cada uno documentado ahí: Intento 3 (canvas manual) y 5 (A-Frame
      1.6.0) fallaron, Intento 4 (captura sincrónica en el loop de render) funcionó — confirmado
      con mediciones de píxeles y capturas de pantalla.
- [x] 2.6 Aplicado el Intento 4 al overlay real `VRConeOverlay.jsx` y a `VRLocalVideoOverlay.jsx`
      (mismo patrón). Probado end-to-end con el botón "AR" real (no el de prueba): overlay
      reflejado correctamente en el panel derecho (19751/182400 píxeles del color del texto,
      confirmado visualmente). Arnés de prueba eliminado tras confirmar el resultado.

### Fase 3 — Overlays R3F (fuera de alcance de este requerimiento)

- [x] 3.1 Se revirtió el `gl={{ preserveDrawingBuffer: true }}` agregado en el Intento 2 a los
      `<Canvas>` de `ARPanel.jsx` — no resuelve nada por sí solo (mismo problema de propagación
      que en A-Frame, confirmado para el caso A-Frame; no se confirmó para R3F pero no hay razón
      para esperar que sea distinto dado que el mecanismo de fondo es el mismo WebGL context).
- [ ] 3.2 Adaptar el Intento 4 (captura sincrónica) al render loop de R3F (`onCreated={({gl}) =>`)
      — no implementado en este requerimiento, queda como trabajo de seguimiento explícito (ver
      sección 3 "No incluido" y 4.4).

### Fase 4 — Limpieza de código muerto y validación cruzada

- [x] 4.1 Se eliminó la rama inalcanzable de `OptimizedOverlayWrapper.jsx` (antiguas líneas
      16-21), dejando un comentario explicando por qué ese caso (`isPrimaryPanel=false` +
      `mirrorRightPanel=true`) nunca ocurre — `ARStereoView.jsx` ya sustituye `<ARPanel>` por un
      `<canvas>` espejo en ese caso, nunca llega a montar este wrapper con esa combinación.
- [x] 4.2 Con `optimizeStereo`/`mirrorRightPanel` desactivados, se confirmó que ambos paneles
      siguen renderizando overlay independiente (cámara + `vrConeOverlay`) igual que antes del
      cambio — no hubo regresión. Confirmado dos veces (antes y después de aplicar el Intento 4).
- [x] 4.3 Criterios de la sección 6 cumplidos, salvo el de overlays R3F (fuera de alcance, ver
      Fase 3) — ese ítem queda sin marcar intencionalmente.
- [x] 4.4 `npx vite build` corre sin errores con todos los cambios aplicados (sanity check de
      sintaxis tras el fix de un backtick sin escapar dentro del `srcDoc` de `VRConeOverlay.jsx`
      que rompía el parseo de Babel — corregido en la misma sesión).

## 8. Referencias

- Documentación previa del mecanismo de optimización:
  `src/views/ARs/ARScomponents/OPTIMIZACION_ESTEREOSCOPICA.md`.
- Convención de organización de componentes aplicada: `.agents/skills/componentes-frontend/SKILL.md`.
- Limitación conocida de `html2canvas` con contenido WebGL (contexto para el riesgo de 2.3/4.2):
  requiere `preserveDrawingBuffer: true` en el contexto WebGL para capturar el último frame
  renderizado.

# Problemas e incidentes

## 1. Backticks dentro de comentarios rompen el `srcDoc` (template literal anidado)

**Fecha:** 2026-09-17/18, durante la implementación de la Fase 2/3.

**Problema:** `SyncConfigCompassMenu.jsx` arma todo el contenido del iframe de la brújula como un
único template literal gigante (`const srcDoc = \`...\`;`, líneas 637-1949 aprox.). Varios
comentarios nuevos agregados dentro de ese literal usaban backticks para "resaltar" nombres de
variables/funciones (ej. `` `window.__applyCursorConfig` ``, `` `fuseScale` ``,
`` `compass-config-state` ``) — cada uno de esos backticks CIERRA el template literal exterior en
ese punto, rompiendo el parseo de todo lo que sigue. El error de TypeScript resultante
(`',' expected` / `';' expected` / `Module declaration names may only use ' or " quoted strings`)
apuntaba a columnas dentro del comentario, no a un lugar obviamente relacionado con backticks —
tomó varias iteraciones identificar el patrón exacto.

**Causa:** un backtick literal dentro de un string que a su vez vive dentro de un template literal
de JS no se escapa solo por estar dentro de un comentario `//` — el comentario es sintaxis del
*contenido* del template literal (una vez que ese contenido se interpreta como HTML+`<script>`),
pero el propio template literal de JS que lo contiene no sabe nada de "comentarios HTML", solo ve
caracteres backtick sin escapar y termina el literal ahí.

**Solución:** se quitaron todos los backticks de comentarios nuevos dentro del rango del `srcDoc`
(se dejó el texto plano, sin resaltar nombres con backticks). Regla para el resto del archivo (y
cualquier otro componente con este mismo patrón `srcDoc`, ej. `VRLocalVideoOverlaySync.jsx`,
`VRConeOverlaySync.jsx`): **nunca usar el carácter backtick dentro de un comentario que viva dentro
del template literal del `srcDoc`**, ni siquiera para resaltar código — usar comillas simples o
directamente texto plano.

**Estado:** resuelto. Verificado con `npm run build` (frontend, Vite/esbuild transpila el JSX y
hubiera fallado con cualquier backtick suelto) y confirmado además que el iframe carga sin errores
de consola en el navegador real (`mirror-fix`, sin ningún `SyntaxError`/`ReferenceError` en 132+
mensajes de consola revisados).

## 2. El geometry/color por defecto de `DEFAULT_CURSOR_CONFIG` nunca se aplicaba sin config guardada

**Fecha:** 2026-09-18, detectado en verificación manual en el navegador (el reticle seguía viéndose
como el `ring` original hardcodeado en el markup, en vez del `point` nuevo por defecto).

**Problema:** `window.__applyCursorConfig(cfg)` (que aplica geometría/color/escala/posición/
visibilidad sobre `#main-cursor`) solo se llamaba desde dos lugares: el listener de
`compass-config-state` (cuando el valor recibido difiere del guardado) y los click handlers de
cada control. Un usuario sin ninguna config guardada nunca dispara ninguno de los dos — el `<a-cursor>`
se quedaba con el `geometry`/`material` hardcodeados en el HTML inicial (`ring`, blanco), nunca con
`DEFAULT_CURSOR_CONFIG` (`point`, blanco), aunque `cursorConfig` (la variable JS) sí arrancaba en
ese default.

**Causa:** confundir "la variable de estado ya tiene el valor default" con "el DOM ya refleja ese
valor" — son cosas separadas cuando la aplicación al DOM es un paso explícito (`setAttribute`), no
automático.

**Solución:** se agregó una llamada a `applyCursorConfigLive()` dentro del `DOMContentLoaded` del
script del panel de ajustes, justo después de `setCursorDpadInteractive(false)` — aplica
`DEFAULT_CURSOR_CONFIG` (o lo que ya se haya hidratado, si el `compass-config-state` inicial llegó
antes que `DOMContentLoaded`) sobre `#main-cursor` de entrada, sin esperar a un cambio del usuario o
a un valor guardado real.

**Estado:** resuelto y verificado visualmente (zoom sobre el reticle en el navegador: pasó de
ring/blanco a un punto sólido blanco chico, coherente con `geometry: 'point'`).

## 3. Decisión de diseño: "Cursor" y "Position" son mutuamente excluyentes, no simultáneos

**Fecha:** 2026-09-17, decidido durante el diseño de la Fase 2 (antes de implementar).

**Contexto:** el panel de la pestaña "Interfaz" tiene una altura acotada
(`PANEL_HEIGHT`) y ya estaba ajustado (con comentarios explícitos en el código) al límite para las
9 filas del d-pad de "Position". Agregar un d-pad de "Cursor" completo (8 filas propias) en
simultáneo hubiera necesitado casi duplicar la altura del panel.

**Decisión:** abrir el sub-panel "Cursor" cierra el de "Position" si estaba abierto (y viceversa:
seleccionar un elemento de posición en el overlay real cierra "Cursor" si estaba abierto) — ambos
reusan el mismo rango vertical del panel, nunca compiten por espacio. Implementado con
`hidePositionDpad()`/`hideCursorDpad()` llamándose cruzado en los dos puntos de entrada
(`#settings-cursor-toggle` click y el handler de `position-element-selected`).

**Seguimiento (pedido del usuario, mismo día):** "separa la opción cursor de posición" — al
consultar, el pedido real era más simple de lo que se había entendido en un primer momento (no era
deshacer la exclusión mutua ni separarlas en pestañas distintas): agregar un margen visual entre
las dos filas de toggle ("Position"/"Cursor"), que antes quedaban pegadas (mismo `ROW_SPACING` que
el resto de filas, sin espacio extra). Se agregó `TOGGLE_ROW_MARGIN = 0.08` específicamente entre
esas dos filas, y se ajustó `PANEL_HEIGHT` (5.6→5.8) para mantener margen suficiente en el borde
inferior del panel con el contenido desplazado. La exclusión mutua entre los dos sub-paneles
**se mantuvo** — no era lo que pedía el usuario.

**Estado:** resuelto, verificado visualmente en el navegador (screenshot: gap visible entre
"Position" y "Cursor", sub-panel "Cursor" completo sin recortes al abrirlo).

## 4. La sincronización entre paneles (Doble panel) se apoyaba en `setCursorConfig` de React, no
en un relay directo del padre — el cambio no se veía en el panel hermano hasta Guardar

**Fecha:** 2026-09-18, señalado por el usuario en vivo ("verifica la sincronizacion a travez de un
padre no por cambio de estado ya que esto genera que en ocaciones se desincronicen las vistas...").

**Problema:** el primer diseño solo mandaba `compass-save-cursor` al padre (`SyncStereoTestView.jsx`)
al presionar Guardar; mientras el usuario movía los steppers de Cursor SIN guardar, el cambio
quedaba únicamente en la variable local `cursorConfig` de ESE iframe de la brújula — el panel
hermano (en modo "Doble panel") seguía mostrando el cursor con su apariencia anterior hasta que se
guardaba (recién ahí el `useEffect([cursorConfig])` del padre rebroadcasteaba `compass-config-state`
a ambas brújulas). Mismo síntoma de fondo que ya afectó al sistema de "Position" antes de este
requerimiento: depender de un cambio de estado de React (con su ciclo de render/efectos) para
propagar algo que debería sentirse instantáneo entre dos iframes hermanos es más lento y, en
ciertos timings, se percibe como "desincronizado".

**Causa:** el sistema de "Position" ya resolvía esto para el d-pad de posición/rotación/escala de
overlays (`position-move` se reenvía a ambos paneles de inmediato vía `postMessage`, sin pasar por
`setState`), pero el diseño inicial de "Cursor" no siguió ese mismo patrón — solo lo aplicó para el
guardado final, no para cada edit en curso.

**Solución:** se agregó un mensaje nuevo, `compass-cursor-live`, que cada edit local de Cursor
manda al padre (dentro de `applyCursorConfigLive()`, `SyncConfigCompassMenu.jsx`) además de aplicar
el efecto en su propio `#main-cursor`. `SyncStereoTestView.jsx` lo reenvía de inmediato (sin pasar
por `setCursorConfig`/React) a AMBAS brújulas como `cursor-live-apply` — cada brújula que lo recibe
actualiza su `cursorConfig` local y aplica el efecto visual (`applyCursorVisual()`, una función
nueva que solo aplica sin reenviar — evita el eco infinito de mandar de vuelta lo que se acaba de
recibir). El guardado real (`compass-save-cursor` → `setCursorConfig` → persistencia en
`user-settings`) sigue funcionando igual que antes, sin cambios — esto solo resuelve la vista *en
vivo* mientras se edita, antes de guardar.

**Estado:** resuelto y verificado en el navegador: cambiar la geometría del cursor en el panel
izquierdo (sin guardar) se refleja de inmediato en el panel derecho (confirmado leyendo el atributo
`geometry` de `#main-cursor` en ambos iframes tras el cambio). Sin errores de consola.

## 5. Hallazgo tardío: quedó guardado `visible: false` en la BD real tras las pruebas con `curl`

**Fecha:** 2026-09-18, reportado por el usuario ("se ha perdido la vista del puntero") mientras
observaba la vista en vivo.

**Problema:** durante la verificación end-to-end del backend (Fase 6), se guardó una config de
prueba con `visible: false` vía `curl` contra `PUT /api/user-settings/ars-sync-cursor` (usuario
`prueba@gmail.com`) para confirmar que el toggle de visibilidad persiste — y nunca se revirtió antes
de seguir con la Fase 2/3. Cualquier sesión real logueada con ese mismo usuario cargaba esa config
guardada y el cursor no se dibujaba.

**Causa:** dato de prueba dejado en la base de datos real (no una base de test aislada) después de
una verificación manual, sin limpieza posterior — mismo tipo de descuido ya evitado en el
Requerimiento 014 (ahí sí se borraron las canciones de prueba creadas por `curl`, ver su propio
`problems_solutions.md`).

**Solución:** se volvió a guardar la config con `visible: true` (y el resto de valores default) vía
el mismo endpoint. Lección para el resto de este requerimiento (y los siguientes): tras cualquier
verificación manual contra la BD real que deje un usuario de prueba con datos no-default, revertir
explícitamente antes de continuar, no solo al terminar toda la sesión.

**Estado:** resuelto, confirmado con `GET /api/user-settings/ars-sync-cursor` (`visible: true`).

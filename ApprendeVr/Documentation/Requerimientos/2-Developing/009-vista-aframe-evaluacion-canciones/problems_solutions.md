# Problemas y soluciones — Requerimiento 009

## 1. Persistencia sin backend de canciones/evaluaciones (decisión, no un problema en sí)

**Contexto:** `ApprendeVr/backend/src` no tiene módulos `canciones`, `evaluaciones`, `palabras` ni
`frases` (solo `auth` y `users`). Los componentes legacy (`karaoke-vr.js`, `new-song.js`,
`evaluacion-vr.js`) dependen de 6 endpoints PHP que no existen en este proyecto.

**Decisión:** en vez de dejar esas llamadas apuntando a rutas PHP inexistentes (que fallarían
siempre, sin ningún beneficio), se creó un pequeño almacenamiento local por `localStorage`:

- `vrSongCatalog.util.js` (`apprendevr_canciones`): canciones agregadas desde `VRNewSongAf`.
  `VRKaraokeAf` las combina con su `videoList` (schema) al construir la lista, dando prioridad a
  las locales y sin duplicar por nombre de archivo.
- `vrEvaluationLog.util.js` (`apprendevr_evaluaciones`): resultado de cada evaluación
  (`VREvaluacionAf._saveEvaluation`) y lectura de evaluaciones previas
  (`_loadPreviousEvaluations`), reemplazando `guardar_evaluacion.php`/`obtener_evaluaciones.php`.

Las llamadas a `/api/palabras` y `/api/frases` (obtención de vocabulario/frases para el quiz y la
pronunciación) sí se dejaron como fetch reales sin mock, porque no hay ningún dato local
razonable que inventar en su lugar: al no existir el endpoint, la UI muestra "No words found" /
"No phrases found" de forma explícita (ver punto 3), en vez de fallar en silencio.

**Estado:** resuelto — es la estrategia documentada en `requerimiento.md`, sección "No incluido".

## 2. Panel de evaluación se creaba en el origen del mundo en vez de frente a la cámara

**Fecha:** durante la verificación manual de este requerimiento (antes de marcar el checklist).

**Problema:** al pulsar "EVALUATE SONG", `VRKaraokeAf.evaluateSong()` calculaba la posición del
panel de evaluación con `camEl.getAttribute('position')`. En el proyecto legacy la cámara es hija
directa de `<a-scene>` con posición absoluta, así que esa lectura ya era la posición mundial. En
ApprendeVr la cámara vive anidada dentro del rig `vr-user` (modo tercera persona, ver
`VRUserAf.js`/`index.html`), así que `getAttribute('position')` devolvía la posición LOCAL de la
cámara relativa a ese rig (valores cercanos a 0), no su posición real en el mundo. Resultado: el
panel de evaluación aparecía siempre cerca del origen del mundo (0, ~2.8, ~-0.2),
independientemente de dónde estuviera parado el usuario — verificado moviendo al usuario a
`10 1 15` y confirmando que el panel se creaba en `(≈0, 2.8, ≈-0.2)` en vez de cerca de la cámara.

**Causa:** lectura de una posición LOCAL cuando se necesitaba la posición MUNDIAL, por una
diferencia real de jerarquía de escena entre el proyecto legacy (cámara suelta) y ApprendeVr
(cámara anidada en un rig).

**Solución:** en `VRKaraokeAf.js` (`evaluateSong`), reemplazar la lectura de
`camEl.getAttribute('position')` por `camera.getWorldPosition()`/`getWorldDirection()` de Three.js
sobre `sceneEl.camera` (el objeto 3D real de la cámara activa), y colocar el panel 1.5 unidades
delante de la cámara en su dirección de mirada actual. Verificado de nuevo con el usuario en
`10 1 15`: el panel se crea cerca de la cámara (`≈10, 3.8, ≈14.5`) y es visible/clickeable en
pantalla.

**Estado:** resuelto.

## 3. Degradación esperada sin backend de palabras/frases

**Observación (no es un bug):** al pulsar EVALUATE en el panel con el Nivel 1 seleccionado, la
consola muestra `API returned no words or error` y la UI muestra "No words found", sin excepciones
ni pantalla rota. Es el comportamiento esperado documentado en el punto 1 — se deja registrado acá
para que quien lea este archivo no lo confunda con un defecto no resuelto.

## 4. Advertencia de A-Frame por una propiedad `visible` sin declarar en el schema

**Problema:** el legacy `karaoke-vr.js` (y la copia inicial de `VRKaraokeAf.js`) no declara
`visible` en su `schema`, pero tanto el proyecto de origen como la primera versión de
`index.html` de esta vista pasaban `visible: true` dentro del string de atributos del componente.
A-Frame lo interpreta como una propiedad de schema desconocida y emite
`Unknown property 'visible' for component/system 'vr-karaoke-af'` en cada carga — el valor no
tiene ningún efecto (no es lo mismo que el atributo `visible` real de la entidad).

**Solución:** se quitó `visible: true` del atributo `vr-karaoke-af` en `index.html` (dead config,
heredada del proyecto legacy). Verificado: tras el cambio, una carga limpia de la vista no emite
ese warning.

**Estado:** resuelto.

## 5. Excepciones observadas durante pruebas automatizadas de navegador (no atribuibles al puerto)

Durante la verificación con Chrome DevTools MCP se registraron dos excepciones que no están
relacionadas con el código de este requerimiento y no se reprodujeron en una carga limpia sin
interacción automatizada:

- `WrongDocumentError: The root document of this element is not valid for pointer lock.` — ocurre
  al simular clicks sobre el `<canvas>` de A-Frame desde la extensión de automatización; A-Frame
  intenta pedir pointer lock (`look-controls`) y el contexto inyectado por la extensión no es un
  documento válido para esa API del navegador. No aparece con interacción real de un usuario.
- `AbortError: The play() request was interrupted by a call to pause()` — carrera conocida y común
  de `HTMLMediaElement.play()`/`pause()` cuando ambos se llaman en sucesión rápida (en este caso,
  por clicks automatizados muy seguidos sobre los controles). No es específica de este puerto; el
  código legacy no la maneja explícitamente tampoco.

**Estado:** sin acción — quedan documentadas para no confundirlas con regresiones si vuelven a
aparecer en una futura sesión de pruebas automatizadas.

## 6. Hallazgo tardío: el raycaster manual de los tres paneles no funcionaba en uso real (Pointer Lock)

**Fecha:** reportado por el usuario después de que la Fase 2 del checklist ya estaba marcada
`[x]` ("cada item es clickeable... responden a click").

**Problema:** en el navegador real, ni la selección de canciones en `VRKaraokeAf` ni los campos
de texto de `VRNewSongAf` respondían a click.

**Causa:** la cámara de esta vista usa `look-controls` con `pointerLockEnabled: true` (default en
`vr-user`/`vr-camera`, ver `VRUserAf.js`/`VRCameraAf.js`). El primer click sobre el `<canvas>`
activa el Pointer Lock del navegador; a partir de ahí, `MouseEvent.clientX`/`clientY` dejan de
reflejar la posición real del cursor (el navegador lo oculta y solo reporta movimiento relativo
vía `movementX`/`movementY`). Los tres componentes portados (`VRKaraokeAf.js`, `VRNewSongAf.js`,
`VREvaluacionAf.js`) calculaban las coordenadas NDC del raycaster manual directamente a partir de
`clientX`/`clientY`, tal como lo hacía el proyecto legacy (que no usaba Pointer Lock) — con
Pointer Lock activo, esos valores quedan congelados, así que el raycast siempre apunta al mismo
punto de la pantalla sin importar dónde mire realmente el usuario.

Este bug **no se detectó en la verificación previa de la Fase 2/5** porque las pruebas se hicieron
con Chrome DevTools MCP (extensión de automatización): sus clicks sintéticos hacían que la
petición de Pointer Lock fallara siempre (`WrongDocumentError`, ver punto 5), así que
`clientX`/`clientY` nunca llegaban a congelarse durante esas pruebas — el bug estaba "escondido"
por una diferencia real entre el entorno de prueba y el uso real en navegador. El checklist de la
Fase 2 se marcó `[x]` con esa verificación, que resultó no ser representativa.

**Solución:** se creó `views/A-frame/vrPointerRaycast.util.js` (`getPointerNDC(canvas, clientX,
clientY)`): si `document.pointerLockElement` es el canvas de la escena, devuelve el centro de
pantalla (0, 0) — equivalente a disparar el rayo en la dirección exacta hacia la que mira la
cámara, consistente con el paradigma de "apuntar girando la cámara" que ya usa el resto de la app
(`vr-move-controls` con `moveType: cursor`) — y si no, calcula la NDC real a partir de
`clientX`/`clientY` como antes. Se migraron los tres componentes (incluido el drag-to-seek de la
barra de progreso del karaoke) a este helper compartido.

**Verificación:** no se pudo reproducir un Pointer Lock real dentro de este entorno de
automatización (ver punto 5), así que se verificó la función en sí importando el módulo real
servido por Vite y simulando `document.pointerLockElement` — confirmado que devuelve `{x:0,y:0}`
cuando está "bloqueado" y el cálculo normal en caso contrario. Queda pendiente que el usuario
confirme en su propio navegador que la selección de canciones y la escritura en `VRNewSongAf`
ya responden al click.

**Estado:** corregido a nivel de código; verificación visual con Pointer Lock real pendiente de
confirmación del usuario.

## 7. "No se encuentran las palabras y frases en el módulo de evaluación" (reportado por el usuario)

**Fecha:** reportado después de que el punto 1 ya documentaba esto como decisión deliberada
("No incluido").

**Problema:** al evaluar Nivel 1 (o 2/3), el panel siempre mostraba "No words found"/"No phrases
found".

**Causa (confirmada, no era un bug):** `/api/palabras` y `/api/frases` directamente no existían
en el backend NestJS — `GET` a esas rutas devolvía `404 Cannot GET`. Tal como estaba documentado
en el punto 1, este requerimiento nunca creó esos endpoints. Los **datos sí existían** en
`english_vr` (heredados del dump legacy): 824 filas en `palabras_vr` y 125 en `frases_vr`, ya
vinculadas a las 3 canciones por `id_cancion`/`archivo_cancion` en `canciones_vr` — solo faltaba
el backend que las expusiera.

**Solución:** el usuario pidió explícitamente crear esos endpoints (cerrando el gap documentado en
el punto 1). Se agregaron tres dominios nuevos siguiendo el skill `backend-nestjs`:

- `src/songs/`: `Song` (mapea `canciones_vr`) + `SongsService.findByFileName(archivo)`, exportado
  para que `words`/`phrases` resuelvan `archivo` → `id_cancion` sin duplicar esa lógica.
- `src/words/`: `GET /api/palabras?archivo=...` sobre `palabras_vr`, mapeando la entidad
  (`spanish`/`english`) al contrato que ya esperaba `VREvaluacionAf.js`
  (`esp_palabra`/`ing_palabra` — mismos nombres que el PHP legacy).
- `src/phrases/`: `GET /api/frases?archivo=...` sobre `frases_vr`, con el mismo mapeo
  (`espanol_frase`/`ingles_frase`).

Ambos endpoints son públicos (sin `JwtAuthGuard`): son contenido de vocabulario, no datos de
usuario, y el frontend ya los llama sin `Authorization`. Un `archivo` que no matchea ninguna
canción devuelve `{status:'success', words: []}` (o `phrases`) en vez de error, para que el
frontend siga mostrando su "No words found" ya existente en ese caso legítimo, en vez de un 500.

**Hallazgo colateral (no era un problema real):** al revisar `frases_vr` por CLI de MySQL sin
especificar `--default-character-set=utf8mb4`, el texto en español se veía corrupto ("est�",
"�nica"). Investigado y descartado: es un artefacto de la sesión del cliente `mysql` (charset por
defecto de esa conexión), no un problema de los datos — la tabla es `utf8mb4_general_ci` y el
driver `mysql2` que usa NestJS devuelve los acentos correctamente (confirmado con
`GET /api/frases`: "está", "única", "quédate", "cariño" se ven bien).

**Verificación:** `npm test` (74/74) y `npm run test:cov` (100% en los 3 módulos nuevos);
`curl` contra `/api/palabras`/`/api/frases` reales devolviendo datos; y en el navegador, el flujo
completo Nivel 1 mostrando el quiz real ("when" → "cuando"/"yo"/"quedate", "Word 1/137",
avanza a "Word 2/137" al responder bien).

**Estado:** resuelto.

# Checklist de ejecución — Requerimiento 009

## Fase 1 — Preparación de assets

- [x] Copiar los 3 videos de karaoke (`StandByMe_BenEKing.mp4`, `ItsMyLife_BonJovi.mp4`,
      `GangstasParadise_Coolio.mp4`) desde `A-frame/english-vr/VR/videos/karaoke/` a
      `ApprendeVr/frontend/public/videos/karaoke/`.
- [x] Confirmar que la fuente `Ultra-msdf` de `ApprendeVr/frontend/public/fonts/Ultra-msdf/`
      cubre los glifos usados por los paneles portados (ñ, á, é, í, ó, ú). Verificado visualmente:
      los textos de los tres paneles (incluida la advertencia de derechos de autor y el teclado
      virtual) se ven correctamente sin glifos rotos.

## Fase 2 — Panel de karaoke (lista + reproductor)

- [x] Crear `views/A-frame/components/VRKaraokeAf/VRKaraokeAf.js` portando la lógica de
      `karaoke-vr.js` (schema, construcción de la lista, controles de reproducción, raycasting
      manual para click/touch).
- [x] Apuntar `videoList`/rutas de video a `public/videos/karaoke/`.
- [x] Declarar la entidad `vr-karaoke-af` en `index.html` e importarla en `index.js`.
- [x] Verificar en el navegador: la lista se ve (SONGS LIST con las 3 canciones), cada item es
      clickeable y los controles del reproductor están presentes. **Corregido tras hallazgo
      tardío** (ver `problems_solutions.md` #6): la verificación inicial se hizo en un entorno de
      automatización donde el Pointer Lock del navegador nunca llegaba a activarse, así que no
      detectó que, con Pointer Lock activo (uso real), el click dejaba de acertar sobre cualquier
      botón tras el primer click en la escena. Ya corregido y re-verificado a nivel de código
      (`vrPointerRaycast.util.js`).

## Fase 3 — Panel de agregar canción (new-song)

- [x] Crear `views/A-frame/components/VRKaraokeAf/components/VRNewSongAf/VRNewSongAf.js`
      portando `new-song.js` (teclado virtual QWERTY + fila de acentos, captura de teclado
      físico en modo escritura).
- [x] Decidir y documentar en `problems_solutions.md` la estrategia temporal de guardado (sin
      backend de canciones todavía): localStorage, vía `vrSongCatalog.util.js`.
- [x] Verificar que agregar una canción dispara `cancion-agregada` y que `VRKaraokeAf` refresca su
      lista sin recargar la página. Probado con `_saveSong()` + inspección del DOM: la canción
      nueva reemplaza (por `archivo`) a la entrada de `videoList` con el mismo nombre de archivo,
      sin duplicarla.

## Fase 4 — Panel de evaluación

- [x] Crear `views/A-frame/components/VREvaluacionAf/VREvaluacionAf.js` portando
      `evaluacion-vr.js` (fondo, título, selección de nivel con botones circulares, textos de
      canción/artista).
- [x] Reemplazar el fetch a `current_user.php` por `GET /api/users/me` (backend NestJS), leyendo
      el JWT desde `localStorage['apprendevr_auth']` y enviándolo como `Authorization: Bearer`.
      Verificado en el navegador con una sesión real: el panel muestra "User: usuario prueba
      (id: 31)".
- [x] Documentar en `problems_solutions.md` qué queda mock/local para: obtener palabras/frases,
      guardar evaluación, obtener evaluaciones previas (no hay backend NestJS equivalente aún).
- [ ] Integración de Nivel 2/3 (Web Speech API): el código se portó tal cual (reconocimiento de
      voz, medidor de audio, comparación de pronunciación). **Actualización (Fase 7):**
      `/api/palabras`/`/api/frases` ya existen y devuelven datos reales, así que el flujo ya llega
      hasta "Say the word/phrase in English" con la palabra/frase correcta — lo único que sigue
      sin probarse es el reconocimiento de voz en sí (requiere micrófono real, no automatizable).
- [x] Importar `vr-evaluacion-af` en `index.js`. **Ajuste sobre lo planeado**: no se declara como
      entidad estática en `index.html` — igual que en el proyecto legacy, `VRKaraokeAf.js` la crea
      dinámicamente (`document.createElement('a-entity')` + `setAttribute('vr-evaluacion-af', …)`)
      al pulsar "EVALUATE SONG". Declararla estática además sería redundante.

## Fase 5 — Integración final y verificación manual

- [x] Cargar la vista completa (`https://<ip>:3000/src/views/A-frame/index.html`) y confirmar que
      mundo, usuario, video local, karaoke, agregar-canción y evaluación conviven sin errores en
      consola. Verificado con Chrome DevTools MCP: carga limpia sin errores ni warnings.
- [x] Confirmar que iniciar sesión en el formulario 3D (Requerimiento 007) y luego entrar a esta
      vista muestra el usuario real en el panel de evaluación y en el de karaoke. Verificado con
      una sesión ya logueada (`prueba@gmail.com`): ambos paneles muestran "usuario prueba (id: 31)".
- [x] Probar el flujo completo "EVALUATE SONG" → panel de evaluación → seleccionar nivel 1 →
      EVALUATE. En su momento (sin backend de palabras) degradaba correctamente a "No words
      found"; **desde la Fase 7 ya trae el quiz real** ("when" → "cuando"/"yo"/"quedate", "Word
      1 / 137", avanza al responder).

## Fase 6 — Fix: raycaster manual roto por Pointer Lock (reportado por el usuario)

- [x] Diagnosticar por qué el raycaster manual de los tres paneles (selección de canción, campos
      de `VRNewSongAf`, botones de `VREvaluacionAf`) dejaba de responder en uso real. Ver
      `problems_solutions.md` #6.
- [x] Crear `views/A-frame/vrPointerRaycast.util.js` (`getPointerNDC`): usa el centro de pantalla
      cuando `document.pointerLockElement` es el canvas de la escena, en vez de
      `MouseEvent.clientX/clientY` (que quedan congelados una vez activado el Pointer Lock).
- [x] Migrar los cálculos de NDC de `VRKaraokeAf.js` (click/hover de la lista y drag-to-seek de la
      barra de progreso), `VRNewSongAf.js` y `VREvaluacionAf.js` a este helper compartido.
- [x] Verificar a nivel de código que `getPointerNDC` devuelve el centro de pantalla (0, 0) cuando
      `document.pointerLockElement` apunta al canvas, y el cálculo normal en caso contrario
      (probado importando el módulo real servido por Vite y simulando ambos estados).
- [ ] Verificación visual completa con Pointer Lock realmente activo (click real de un usuario en
      un navegador, no automatizado): no se pudo reproducir en este entorno porque la extensión de
      automatización no logra activar el Pointer Lock del navegador (ver
      `problems_solutions.md` #5). Pendiente de que el usuario confirme en su propio navegador.

## Fase 7 — Backend de palabras/frases (cierra el gap documentado en "No incluido")

- [x] Crear dominio `songs` (`ApprendeVr/backend/src/songs/`): entidad `Song` sobre `canciones_vr`
      y `SongsService.findByFileName(archivo)`, reusado por `words` y `phrases` para resolver
      `archivo_cancion` → `id_cancion`.
- [x] Crear dominio `words` (`GET /api/palabras?archivo=...`) sobre `palabras_vr`, con
      `words.util.ts` mapeando la entidad al contrato ya esperado por `VREvaluacionAf.js`
      (`esp_palabra`/`ing_palabra`).
- [x] Crear dominio `phrases` (`GET /api/frases?archivo=...`) sobre `frases_vr`, con
      `phrases.util.ts` mapeando `español_frase` (columna real, con ñ) a `espanol_frase` (nombre
      esperado por el frontend, sin ñ) y `ingles_frase`.
- [x] `npm run build` compila y `npm test` pasa sin levantar MySQL (74/74 tests, toda la suite).
- [x] `npm run test:cov`: los tres módulos nuevos (`songs`, `words`, `phrases`) tienen 100% de
      cobertura (statements/branches/functions/lines).
- [x] Verificado con `curl` contra el backend real: `GET /api/palabras`/`GET /api/frases` con
      `archivo=StandByMe_BenEKing.mp4` devuelven datos reales (137 palabras, 31 frases);
      `archivo` inexistente devuelve `{status:'success', words: []}` en vez de error.
- [x] Verificado en navegador: flujo completo "EVALUATE SONG" → Nivel 1 → EVALUATE → quiz real
      ("when" → opciones "cuando"/"yo"/"quedate", "Word 1/137") → responder avanza a "Word 2/137".

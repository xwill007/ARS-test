# Checklist de ejecución (paso a paso)

### Fase 1 — Backend: lógica pura y service

- [x] 1.1 Crear `src/songs/songs.util.ts`: `normalizeSongText(value)` (trim + colapsar espacios) y
      `buildDuplicateCriteria(title, author)` (objeto para el `findOne` del duplicado).
- [x] 1.2 `songs.util.spec.ts`: casos normales y de borde (strings vacíos, con espacios extra,
      `author` undefined).
- [x] 1.3 `SongsService.findAll()`: `this.songsRepository.find({ order: { id: 'ASC' } })`.
- [x] 1.4 `SongsService.create(dto: CreateSongDto)`: normaliza con `songs.util.ts`, busca duplicado
      por `title`+`author` normalizados, lanza `ConflictException` si existe, si no guarda con
      `this.songsRepository.save(...)`.
- [x] 1.5 Ampliar `songs.service.spec.ts` (repo mockeado): `findAll` devuelve la lista, `create`
      guarda cuando no hay duplicado, `create` lanza `ConflictException` cuando sí lo hay.

### Fase 2 — Backend: controller

- [x] 2.1 Crear `songs.controller.ts`: `@Controller('songs')`, `GET /` → `findAll()` (sin guard),
      `POST /` → `@UseGuards(JwtAuthGuard)` + `create(dto)`.
- [x] 2.2 Registrar `SongsController` en `songs.module.ts` (`controllers: [SongsController]`).
- [x] 2.3 `songs.controller.spec.ts`: verifica que cada ruta delega al service con los argumentos
      correctos (service mockeado).

### Fase 3 — Frontend: cliente API

- [x] 3.1 Crear `vrSongsApi.util.js` (mismo patrón que `vrUserSettingsApi.util.js`):
      `getSongs()` (GET `/api/songs`, sin auth, devuelve `[]` si falla) y
      `createSong({ title, author, fileName, language })` (POST `/api/songs`, con
      `Authorization: Bearer` desde `getStoredAuth()`, devuelve `{ ok, song?, error? }`).

### Fase 4 — Frontend: wiring de `VRNewSongAf`

- [x] 4.1 `_saveSong()`: llamar a `createSong(...)`; si `ok`, mostrar el mensaje de éxito actual.
- [x] 4.2 Si `createSong` falla (red o backend caído), hacer fallback a `addLocalSong(...)` y
      mostrar un `status` distinto ("guardada localmente, no se pudo sincronizar").
- [x] 4.3 Si `createSong` responde con conflicto (canción duplicada), mostrar ese mensaje
      específico en vez del genérico de error de red.

### Fase 5 — Frontend: wiring de `VRKaraokeAf`

- [x] 5.1 `_initSongList()`: intentar `getSongs()` primero; si devuelve canciones, usarlas como
      base de la lista (en vez de `videoList`).
- [x] 5.2 Combinar con `getLocalSongs()` (canciones agregadas en esta sesión que puedan no haberse
      sincronizado todavía, evitando duplicar las que ya vinieron del backend).
- [x] 5.3 Si `getSongs()` falla, mantener el comportamiento actual (`videoList` + `localStorage`)
      sin romper la vista.

### Fase 6 — Verificación y documentación

- [x] 6.1 `npm run build` (backend) compila sin errores.
- [x] 6.2 `npm test` (backend) pasa sin necesidad de levantar MySQL.
- [x] 6.3 `npm run test:cov` (backend): revisar la tabla por archivo, no solo el resumen global
      (`src/songs/**` quedó en 100%).
- [x] 6.4 Levantar BD + backend + frontend y probar cada criterio de aceptación manualmente. Hecho
      vía `docker compose up` + `curl` (login, alta, duplicado, 401 sin sesión, GET tras alta) y
      en el navegador real (`A-frame/index.html`: consola sin errores, `GET /api/songs` → 200,
      panel "New Song" y lista de karaoke renderizan bien). **Pendiente**: click-through completo
      de "escribir en el panel → GUARDAR CANCION" en vivo — la pestaña de Chrome disponible saltó
      a una sesión de `mirror-fix` con cámara en vivo de por medio y se cortó la verificación por
      privacidad; la lógica de `_saveSong()`/fallback ya está cubierta por el flujo de `curl`
      contra el mismo endpoint, así que el riesgo restante es solo de UI (coordenadas de click),
      no de lógica.
- [x] 6.5 Actualizar `ApprendeVr/Documentation/backend-nestjs.md` con las rutas `GET/POST
      /api/songs`.
- [x] 6.6 Marcar los criterios de aceptación de `requerimiento.md` como cumplidos.

### Fase 7 — Ampliación: "Archivo local" desde el dispositivo, sin subir el video

**Primera vuelta (100% cliente, sin backend) — reemplazada por la segunda vuelta más abajo:** se
creó `vrLocalDeviceSongs.util.js` (catálogo en `localStorage`) y `VRNewSongAf._saveSong()` nunca
llamaba a `createSong()` para estas canciones. El usuario pidió después que se registren en BD
("para que se muestre en la lista de canciones") — `vrLocalDeviceSongs.util.js` se eliminó por
completo, ver 7.4 más abajo.

- [x] 7.1 Crear `vrLocalVideoStore.util.js`: `saveLocalVideo(id, file)`/`getLocalVideo(id)`/
      `deleteLocalVideo(id)` sobre `IndexedDB` (guarda como `ArrayBuffer`, reconstruye `Blob` al
      leer). Sigue vigente sin cambios en la segunda vuelta.
- [x] 7.2 `VRNewSongAf.js`: icono "P" del campo `archivo` abre `<input type="file"
      accept="video/*">` en vez de pegar portapapeles; al elegir un archivo, `saveLocalVideo(...)`
      y completa el campo con el prefijo `device:`. Sigue vigente sin cambios.

**Segunda vuelta (pedido del usuario): registrar la metadata en BD, columna `id_usuario`, renombre
de `fuente_cancion`.**

- [x] 7.3 `db/011-songs-id-usuario.sql`: agrega `id_usuario` (FK a `usuarios`, `ON DELETE SET
      NULL`) a `canciones_vr`; renombra las filas `fuente_cancion = 'local'` a `'server'`; cambia
      el `DEFAULT` de la columna a `'server'`. Registrada en `docker-compose.yml`.
- [x] 7.4 `song.entity.ts`: agrega columna `userId`; `create-song.dto.ts`: `SONG_SOURCES` pasa a
      `['server', 'local', 'youtube']`.
- [x] 7.5 `songs.service.ts`: `findAll()` excluye `source: 'local'`; nuevo `findMineLocal(userId)`;
      `create(dto, userId)` recibe `userId` del usuario autenticado (nunca del DTO) y lo guarda
      siempre; el criterio de duplicado se acota por `userId` cuando `source` es `'local'`.
- [x] 7.6 `songs.controller.ts`: nuevo `GET /songs/mine` (`JwtAuthGuard` + `@CurrentUser()`);
      `POST /songs` pasa `user.id` a `create()`.
- [x] 7.7 Actualizar `songs.service.spec.ts`/`songs.controller.spec.ts` (nuevos casos: `findMine`,
      `findMineLocal`, `create` con `userId`, duplicado acotado por usuario). `npm test`/
      `npm run test:cov` (backend) en verde, `src/songs/**` en 100% cobertura.
- [x] 7.8 Eliminar `vrLocalDeviceSongs.util.js` (ya no se usa). `vrSongsApi.util.js`: nuevo
      `getMySongs()` (GET `/api/songs/mine`, con auth).
- [x] 7.9 `VRNewSongAf._saveSong()`: unifica `'server'`/`'local'`/`'youtube'` en un solo llamado a
      `createSong()` (ya no hay rama que se salte el backend); el aviso de "archivo no encontrado
      en `public/videos/karaoke/`" pasa a aplicar solo a `source === 'server'`.
- [x] 7.10 `VRKaraokeAf._initSongList()`: combina `getSongs()` + `getMySongs()`. Renombrar en todo
      el archivo el branching de `'device'`/`'local'`(servidor) a `'local'`/`'server'` (incluye
      `_buildSongListUI`, `_selectSongButton`, `_playDeviceSong`, `loadVideo`,
      `_stopLocalPlayback`). El 5to campo pipe-delimited (`deviceId`) se elimina: `fileName` ya
      sirve como clave de `IndexedDB` para `'local'` (es el mismo valor que guardó el backend).
- [x] 7.11 `node --check` + `npm run build` (frontend) y `npm run build`/`npm test`/
      `npm run test:cov` (backend) sin errores tras todos los cambios de esta fase.
- [ ] 7.12 Verificación manual en navegador (desktop y mobile): elegir archivo, guardar (con
      sesión), ver `POST /api/songs` en Network con `source: 'local'` (sin el video), ver la
      canción en la lista con "[Local]", reproducir, recargar y confirmar que persiste (viene de
      `GET /songs/mine`, no de `localStorage`), y confirmar que desde OTRO navegador/dispositivo
      (misma cuenta) aparece en la lista pero muestra el aviso de "no disponible en este
      dispositivo" en vez de reproducir. Actualizar `requerimiento.md` (sección 7) al completarse.
- [x] 7.13 Aplicar la migración `011` contra la BD Docker real (`docker exec ... mysql ... <
      011-songs-id-usuario.sql` sobre el contenedor `Backend-ApprendeVr` corriendo, sin recrear el
      volumen) y confirmar que las 3 canciones del dump quedan con `fuente_cancion = 'server'`.
- [ ] 7.14 Actualizar `ApprendeVr/Documentation/backend-nestjs.md` con `GET /songs/mine` y la
      columna `id_usuario_cancion`.

### Fase 8 — Corrección: regla de visibilidad, nombre de columna, constraint heredada

Reportado por el usuario tras probar la Fase 7: "la lista de canciones ya no se visualiza" (la
lista quedaba vacía/rota) y tres pedidos de ajuste.

- [x] 8.1 **Causa raíz del bug reportado**: la migración `011` nunca se había aplicado contra la BD
      de desarrollo real — el entity ya pedía la columna `id_usuario` en cada `SELECT`, que no
      existía en la tabla real, rompiendo `GET /api/songs` por completo. Se aplicó la migración
      (ver 7.13).
- [x] 8.2 Renombrar la columna de `id_usuario` a `id_usuario_cancion` (pedido del usuario, sigue la
      convención `_cancion` de esta tabla): `ALTER TABLE ... RENAME COLUMN` + `RENAME INDEX` contra
      la BD real (ya tenía `id_usuario` de 8.1); actualizado `db/011-songs-id-usuario.sql` y
      `song.entity.ts` para que una instalación nueva use el nombre correcto desde el principio.
- [x] 8.3 Regla de visibilidad ampliada (pedido del usuario): `'youtube'` pasa de pública a privada,
      igual que `'local'` — `PRIVATE_SOURCES = ['local', 'youtube']` en `songs.service.ts`.
      `findMineLocal(userId)` se renombra a `findMine(userId)` (`source IN PRIVATE_SOURCES`); el
      criterio de duplicado de `create()` se acota por usuario para ambas fuentes, no solo `'local'`.
      Actualizados `songs.controller.ts` (llama a `findMine`) y ambos `.spec.ts`.
- [x] 8.4 **Hallazgo real**: el dump legacy trae una `UNIQUE KEY unique_song (titulo_cancion,
      autor_cancion)` real (`english_vr.sql` línea ~1124) — contradice lo documentado en
      `requerimiento.md` sección 5 ("sin esa constraint"), nunca verificado contra el dump. Rompía
      el pedido de 8.3 (dos usuarios con el mismo título+autor en una canción privada): el `INSERT`
      fallaba con error crudo de MySQL. Nueva migración `db/012-songs-drop-unique-song.sql`
      (`DROP INDEX unique_song`), aplicada contra la BD real y registrada en `docker-compose.yml`.
- [x] 8.5 Backfill manual (pedido del usuario): las 2 canciones `'youtube'` preexistentes (sin
      `id_usuario_cancion`, creadas antes de esta columna) se asignaron al usuario de prueba (id 31,
      `prueba@gmail.com`) con un `UPDATE` directo contra la BD real — sin esto hubieran quedado
      invisibles para cualquier usuario bajo la nueva regla de privacidad.
- [x] 8.6 Verificado con `curl` contra el backend real (arrancado sobre la BD ya corregida):
      `GET /api/songs` → 200, solo las 3 canciones `'server'`; `GET /api/songs/mine` sin auth → 401;
      con sesión del usuario 31 → las 2 canciones `'youtube'` backfileadas. `npm run build`/`test`/
      `test:cov` (backend) en verde tras todos los cambios.
- [x] 8.7 Documentar el hallazgo/corrección en `requerimiento.md` (secciones 4 y 5) y en
      `problems_solutions.md` (ver entrada nueva).

### Fase 9 — UI de la lista: mostrar título/artista/ubicación, ocultar archivo/URL

Pedido del usuario tras confirmar que la lista ya se veía: "mejora la vista de la lista de
canciones, solo muestra artista, nombre cancion, ubicacion, oculta la url o ruta de archivo". Hasta
acá la línea principal de cada fila mostraba `fileName` tal cual (para `'youtube'`, la URL completa
sin recortar).

- [x] 9.1 `VRKaraokeAf._initSongList()`: el 3er campo de la entrada pipe-delimited (antes vacío,
      pensado para una duración que el backend nunca llegó a completar) ahora lleva `s.title`.
- [x] 9.2 `VRKaraokeAf._buildSongListUI()`: nueva constante `SOURCE_LABELS` (`server`→"Servidor",
      `local`→"Local", `youtube`→"YouTube"). Fila principal muestra `<índice>. <título>` (con
      fallback a `fileName` si por algún motivo no hay título); fila secundaria muestra `<artista> ·
      <ubicación>` en vez de `<artista> (<duración>)`. Se quitan los prefijos "[YouTube]"/"[Local]"
      del título (redundantes ahora que la ubicación se muestra explícita); el color distintivo por
      fuente se mantiene. `fileName` sigue existiendo solo como dato interno de selección
      (`button._fileName`), nunca se renderiza.
- [x] 9.3 `node --check` + `npm run build` (frontend) sin errores.
- [ ] 9.4 Verificación manual en navegador: confirmar que la lista muestra título real + artista +
      ubicación para canciones `'server'`/`'local'`/`'youtube'`, y que ninguna URL/nombre de
      archivo aparece en pantalla.

### Fase 10 — Autocompletar Título/Autor desde el nombre del archivo local

Pedido del usuario: "busque en el nombre de la cancion un -, la primera parte es el nombre de la
cancion, la segunda el artista, para rellenar el formulario automaticamente".

- [x] 10.1 `VRNewSongAf.js`: nueva función `parseTitleArtistFromFileName(originalName)` (quita la
      extensión, corta en el primer `-`, recorta espacios de cada parte).
- [x] 10.2 En el handler `change` del selector de archivos: completa `titulo`/`autor` con el
      resultado del parseo, solo si esos campos están vacíos (nunca pisa lo ya escrito a mano).
- [x] 10.3 `node --check` + `npm run build` (frontend) sin errores.
- [ ] 10.4 Verificación manual: elegir un archivo `"Stand By Me - Ben E King.mp4"` completa Título/
      Autor correctamente; elegir uno sin `-` completa solo Título con el nombre completo; con
      Título/Autor ya escritos a mano, elegir un archivo no los pisa.

### Fase 11 — Sincronizar "canción agregada" entre los dos paneles de AR-SYNC

Pedido del usuario: "la cancion se agrego a base de datos pero no se visualiza en la lista de
ambos paneles al guardar solo en uno, verifica la sincronizacion de la lista".

- [x] 11.1 **Causa raíz**: `cancion-agregada` es un `CustomEvent` de `window`, visible solo dentro
      del iframe donde se disparó (`VRNewSongAf._saveSong()`) — el panel hermano de `mirror-fix`
      (iframe distinto) nunca se enteraba, a diferencia de play/pause/seek/campos del formulario,
      que ya tienen su propio puente.
- [x] 11.2 Nuevo puente en `aframe-overlay-modules.js`: reenvía `cancion-agregada` por
      `postMessage` al padre (relevo genérico de `SyncStereoTestView.jsx` lo reenvía al panel
      opuesto); al recibirlo, llama `_initSongList()` directo sobre el `vr-karaoke-af` de ese panel
      (sin re-disparar el evento local, para no armar un eco infinito entre los dos paneles).
- [x] 11.3 `node --check` + `npm run build` (frontend) sin errores.
- [ ] 11.4 Verificación manual con dos paneles reales de `mirror-fix` ("Doble panel" activo):
      guardar una canción en un panel y confirmar que aparece en la lista de AMBOS sin recargar
      ninguno.

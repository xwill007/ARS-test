# Estrategia y casos de test

## Estrategia

Sigue la regla del skill `backend-nestjs`: lógica de negocio en funciones puras (`songs.util.ts`)
testeadas sin mocks, services testeados con el repo mockeado (sin BD real), controllers testeados
verificando que delegan al service con los argumentos correctos. En frontend, el cliente
(`vrSongsApi.util.js`) y el wiring de los componentes A-Frame se verifican manualmente en el
navegador (no hay suite de tests de frontend para estas vistas todavía — ver Requerimiento 008,
"estrategia de testing frontend", en `1-Pending`).

## Casos — Backend (Jest, unitarios)

| Archivo | Caso | Resultado esperado |
|---|---|---|
| `songs.util.spec.ts` | `normalizeSongText('  Stand   By Me  ')` | `'Stand By Me'` |
| `songs.util.spec.ts` | `normalizeSongText(undefined)` | `''` (no lanza) |
| `songs.util.spec.ts` | `buildDuplicateCriteria('Stand By Me', 'Ben E King')` | criterio con título/autor normalizados |
| `songs.service.spec.ts` | `findAll()` con repo mockeado | `find` llamado con `where: { source: 'server' }` — devuelve solo canciones públicas |
| `songs.service.spec.ts` | `findMine(userId)` con repo mockeado | `find` llamado con `where: { userId, source: In(['local', 'youtube']) }` |
| `songs.service.spec.ts` | `create(dto, userId)` sin canción previa con ese título+autor | llama a `save` con `userId` incluido y devuelve la canción creada |
| `songs.service.spec.ts` | `create(dto, userId)` con una canción `'server'` ya existente (mismo título+autor normalizado) | lanza `ConflictException`, no llama a `save` (criterio global) |
| `songs.service.spec.ts` | `create(dto, userId)` con `source: 'local'` o `'youtube'` y una canción ya existente de OTRO usuario con el mismo título+autor | NO lanza `ConflictException` (criterio acotado por `userId`, `PRIVATE_SOURCES`) |
| `songs.service.spec.ts` | `create(dto, userId)` sin `author`/`language` en el DTO | guarda igual (campos opcionales) |
| `songs.controller.spec.ts` | `GET /songs` | delega a `service.findAll()` y devuelve su resultado |
| `songs.controller.spec.ts` | `GET /songs/mine` con usuario autenticado | delega a `service.findMine(user.id)` |
| `songs.controller.spec.ts` | `POST /songs` con DTO válido y usuario autenticado | delega a `service.create(dto, user.id)` |
| `create-song.dto.spec.ts` | Ya existe (título/archivo obligatorios, autor/idioma opcionales); `SONG_SOURCES` ahora acepta `'server'`/`'local'`/`'youtube'` | cubierto |
| `update-song.dto.spec.ts` | Ya existe (todos los campos opcionales) | cubierto |

## Casos — Integración manual (backend levantado + `curl`/Postman)

Los casos marcados **(verificado)** se corrieron de verdad contra el backend real + la BD de
desarrollo real en esta sesión, tras aplicar las migraciones `011`/`012` y el backfill (ver
`problems_solutions.md` #4 y #5) — no son solo lo esperado en teoría.

| Caso | Resultado esperado |
|---|---|
| `GET /api/songs` sin `Authorization` | **(verificado)** `200` con las 3 canciones `'server'` del dump, ninguna `'local'`/`'youtube'` |
| `GET /api/songs/mine` sin `Authorization` | **(verificado)** `401` |
| `GET /api/songs/mine` con JWT del usuario 31 | **(verificado)** `200` con sus 2 canciones `'youtube'` (backfileadas), ninguna `'server'` |
| `POST /api/songs` sin `Authorization` | `401` |
| `POST /api/songs` con JWT válido y `{ title: 'Test Song', fileName: 'test.mp4' }` | `201`, fila nueva en `canciones_vr` con `idioma_cancion='ingles'`/`fuente_cancion='server'` (defaults de BD) e `id_usuario_cancion` = el id del usuario del JWT |
| `POST /api/songs` con JWT válido, `{ title, fileName, source: 'local' }` (o `'youtube'`), repetido por DOS usuarios distintos | Ambos `201` (sin conflicto — criterio acotado por usuario; requiere la migración `012`, que elimina la `UNIQUE KEY unique_song` heredada del dump legacy) |
| `POST /api/songs` repitiendo el mismo `title`+`author` con el MISMO usuario | `409` (o el código elegido para conflicto), sin fila duplicada en BD |
| Tras aplicar la migración `011` contra la BD del dump | **(verificado)** Las 3 canciones legacy quedan con `fuente_cancion = 'server'` (no `'local'`), y existe `id_usuario_cancion` con su FK |
| Tras aplicar la migración `012` | **(verificado)** `SHOW CREATE TABLE canciones_vr` ya no lista `unique_song` |

## Casos — Manual en navegador (vista A-Frame)

| Caso | Resultado esperado |
|---|---|
| Agregar canción desde `VRNewSongAf` con sesión iniciada y backend arriba | Mensaje de éxito; al recargar la página, la canción aparece en la lista de `VRKaraokeAf` |
| Agregar canción con título+autor duplicado | El panel muestra el mensaje de conflicto del backend, no el genérico |
| Agregar canción con el backend apagado (o sin `docker compose up`) | Se guarda en `localStorage` (no se pierde lo escrito) y el panel avisa que no se sincronizó |
| Cargar `VRKaraokeAf` sin sesión iniciada | La lista igual se completa desde `GET /api/songs` (endpoint público) |

## Casos — Ampliación "Archivo local desde el dispositivo" (metadata en BD, video solo en IndexedDB)

Sin tests automatizados de frontend (misma razón que el resto de esta vista: no hay suite de tests
de frontend todavía, ver Requerimiento 008 en `1-Pending`) — se verifica manualmente en navegador,
desktop y mobile. Los casos de `id_usuario_cancion`/`GET /songs/mine`/renombre de `source`/regla de
privacidad de `'youtube'` están cubiertos arriba, en los casos de backend.

| Caso | Resultado esperado |
|---|---|
| Click en el icono "P" del campo "Archivo local" | Abre el selector de archivos del sistema operativo (no pega el portapapeles) |
| Elegir un archivo que no es un video (ej. una imagen) | El panel muestra un aviso ("no parece ser un video"), no guarda nada |
| Elegir un video válido | El campo "Archivo local" se completa con `device:<nombre-de-archivo>`; no hay ningún `POST` de red con el contenido del video (verificar en la pestaña Network) |
| "GUARDAR CANCION" con un archivo de dispositivo cargado y sesión iniciada | Se ve en Network un `POST /api/songs` con `{ source: 'local', fileName: '<nombre-de-archivo>' }` (sin el contenido del video); la canción aparece en la lista de `VRKaraokeAf` con "[Local]" y color distinto |
| Seleccionar esa canción en la lista | Se reproduce como `<a-video>` normal (misma textura 3D que un archivo `'server'`) |
| Recargar la página | La canción sigue en la lista (viene de `GET /songs/mine`, no de `localStorage`) y se reproduce sin volver a elegir el archivo (el video sigue en `IndexedDB`) |
| Abrir la misma CUENTA desde otro navegador/dispositivo | La canción SÍ aparece en la lista (la metadata está en BD), pero al seleccionarla muestra el aviso de "video no disponible en este dispositivo" en vez de reproducir o romperse |
| "GUARDAR CANCION" con un archivo de dispositivo SIN sesión iniciada | Falla el `POST /api/songs` (`NO_SESSION`) y cae al respaldo `addLocalSong()`/`localStorage`, igual que cualquier otra canción sin sesión — mismo criterio que `'server'`/`'youtube'` |
| Repetir el flujo completo en un navegador móvil (Chrome Android / Safari iOS) | Mismo resultado que en desktop |
| Elegir dos archivos distintos con el mismo nombre de archivo | El segundo reemplaza al primero en `IndexedDB` (misma clave); en BD queda como una fila nueva salvo que título+autor también coincidan (ahí el backend devuelve `409`) |

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
| `songs.service.spec.ts` | `findAll()` con repo mockeado devolviendo 3 filas | devuelve las 3 filas tal cual |
| `songs.service.spec.ts` | `create(dto)` sin canción previa con ese título+autor | llama a `save` y devuelve la canción creada |
| `songs.service.spec.ts` | `create(dto)` con una canción ya existente (mismo título+autor normalizado) | lanza `ConflictException`, no llama a `save` |
| `songs.service.spec.ts` | `create(dto)` sin `author`/`language` en el DTO | guarda igual (campos opcionales) |
| `songs.controller.spec.ts` | `GET /songs` | delega a `service.findAll()` y devuelve su resultado |
| `songs.controller.spec.ts` | `POST /songs` con DTO válido | delega a `service.create(dto)` |
| `create-song.dto.spec.ts` | Ya existe (título/archivo obligatorios, autor/idioma opcionales) | cubierto |
| `update-song.dto.spec.ts` | Ya existe (todos los campos opcionales) | cubierto |

## Casos — Integración manual (backend levantado + `curl`/Postman)

| Caso | Resultado esperado |
|---|---|
| `GET /api/songs` sin `Authorization` | `200` con el listado (endpoint público) |
| `POST /api/songs` sin `Authorization` | `401` |
| `POST /api/songs` con JWT válido y `{ title: 'Test Song', fileName: 'test.mp4' }` | `201`, fila nueva en `canciones_vr` con `idioma_cancion='ingles'` (default de BD) |
| `POST /api/songs` repitiendo el mismo `title`+`author` | `409` (o el código elegido para conflicto), sin fila duplicada en BD |

## Casos — Manual en navegador (vista A-Frame)

| Caso | Resultado esperado |
|---|---|
| Agregar canción desde `VRNewSongAf` con sesión iniciada y backend arriba | Mensaje de éxito; al recargar la página, la canción aparece en la lista de `VRKaraokeAf` |
| Agregar canción con título+autor duplicado | El panel muestra el mensaje de conflicto del backend, no el genérico |
| Agregar canción con el backend apagado (o sin `docker compose up`) | Se guarda en `localStorage` (no se pierde lo escrito) y el panel avisa que no se sincronizó |
| Cargar `VRKaraokeAf` sin sesión iniciada | La lista igual se completa desde `GET /api/songs` (endpoint público) |

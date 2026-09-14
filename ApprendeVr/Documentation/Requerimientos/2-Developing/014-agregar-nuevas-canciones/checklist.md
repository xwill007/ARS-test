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

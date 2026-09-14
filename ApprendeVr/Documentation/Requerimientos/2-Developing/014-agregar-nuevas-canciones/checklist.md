# Checklist de ejecución (paso a paso)

### Fase 1 — Backend: lógica pura y service

- [ ] 1.1 Crear `src/songs/songs.util.ts`: `normalizeSongText(value)` (trim + colapsar espacios) y
      `buildDuplicateCriteria(title, author)` (objeto para el `findOne` del duplicado).
- [ ] 1.2 `songs.util.spec.ts`: casos normales y de borde (strings vacíos, con espacios extra,
      `author` undefined).
- [ ] 1.3 `SongsService.findAll()`: `this.songsRepository.find({ order: { id: 'ASC' } })`.
- [ ] 1.4 `SongsService.create(dto: CreateSongDto)`: normaliza con `songs.util.ts`, busca duplicado
      por `title`+`author` normalizados, lanza `ConflictException` si existe, si no guarda con
      `this.songsRepository.save(...)`.
- [ ] 1.5 Ampliar `songs.service.spec.ts` (repo mockeado): `findAll` devuelve la lista, `create`
      guarda cuando no hay duplicado, `create` lanza `ConflictException` cuando sí lo hay.

### Fase 2 — Backend: controller

- [ ] 2.1 Crear `songs.controller.ts`: `@Controller('songs')`, `GET /` → `findAll()` (sin guard),
      `POST /` → `@UseGuards(JwtAuthGuard)` + `create(dto)`.
- [ ] 2.2 Registrar `SongsController` en `songs.module.ts` (`controllers: [SongsController]`).
- [ ] 2.3 `songs.controller.spec.ts`: verifica que cada ruta delega al service con los argumentos
      correctos (service mockeado).

### Fase 3 — Frontend: cliente API

- [ ] 3.1 Crear `vrSongsApi.util.js` (mismo patrón que `vrUserSettingsApi.util.js`):
      `getSongs()` (GET `/api/songs`, sin auth, devuelve `[]` si falla) y
      `createSong({ title, author, fileName, language })` (POST `/api/songs`, con
      `Authorization: Bearer` desde `getStoredAuth()`, devuelve `{ ok, song?, error? }`).

### Fase 4 — Frontend: wiring de `VRNewSongAf`

- [ ] 4.1 `_saveSong()`: llamar a `createSong(...)`; si `ok`, mostrar el mensaje de éxito actual.
- [ ] 4.2 Si `createSong` falla (red o backend caído), hacer fallback a `addLocalSong(...)` y
      mostrar un `status` distinto ("guardada localmente, no se pudo sincronizar").
- [ ] 4.3 Si `createSong` responde con conflicto (canción duplicada), mostrar ese mensaje
      específico en vez del genérico de error de red.

### Fase 5 — Frontend: wiring de `VRKaraokeAf`

- [ ] 5.1 `_initSongList()`: intentar `getSongs()` primero; si devuelve canciones, usarlas como
      base de la lista (en vez de `videoList`).
- [ ] 5.2 Combinar con `getLocalSongs()` (canciones agregadas en esta sesión que puedan no haberse
      sincronizado todavía, evitando duplicar las que ya vinieron del backend).
- [ ] 5.3 Si `getSongs()` falla, mantener el comportamiento actual (`videoList` + `localStorage`)
      sin romper la vista.

### Fase 6 — Verificación y documentación

- [ ] 6.1 `npm run build` (backend) compila sin errores.
- [ ] 6.2 `npm test` (backend) pasa sin necesidad de levantar MySQL.
- [ ] 6.3 `npm run test:cov` (backend): revisar la tabla por archivo, no solo el resumen global.
- [ ] 6.4 Levantar BD + backend + frontend y probar cada criterio de aceptación manualmente
      (incluido el caso "backend apagado").
- [ ] 6.5 Actualizar `ApprendeVr/Documentation/backend-nestjs.md` con las rutas `GET/POST
      /api/songs`.
- [ ] 6.6 Marcar los criterios de aceptación de `requerimiento.md` como cumplidos.

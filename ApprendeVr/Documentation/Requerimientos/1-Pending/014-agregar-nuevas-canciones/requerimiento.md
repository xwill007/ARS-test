# Requerimiento 014 — Persistir canciones nuevas en el backend (módulo de ingreso de canciones)

## 1. Objetivo

Conectar el panel "New Song" de la vista A-Frame (`VRNewSongAf`) al backend NestJS, para que las
canciones agregadas por un usuario queden guardadas en la base `english_vr` (tabla `canciones_vr`)
y visibles para cualquier usuario que abra el karaoke, en vez de guardarse solo en el
`localStorage` del navegador que las creó.

## 2. Antecedentes y estado actual

- El panel 3D `VRNewSongAf` (`ApprendeVr/frontend/src/views/A-frame/components/VRKaraokeAf/
  components/VRNewSongAf/VRNewSongAf.js`) ya permite escribir título/autor/archivo/URL de YouTube
  con un teclado virtual + teclado físico, y al "Guardar" llama a `addLocalSong()`
  (`vrSongCatalog.util.js`), que solo persiste en `localStorage['apprendevr_canciones']`.
- `VRKaraokeAf.js` arma la lista de canciones combinando su schema `videoList` (3 canciones
  hardcodeadas) con `getLocalSongs()` del mismo `localStorage`, y se refresca al recibir el evento
  `cancion-agregada` que dispara `VRNewSongAf`. No hace ningún `fetch` al backend hoy.
- Esto fue una decisión explícita del Requerimiento 009 (sección "No incluido"): en ese momento no
  existía ningún módulo de dominio en `ApprendeVr/backend/src` más que `auth`/`users`, y se dejó
  anotado que "crear esos módulos de backend... queda para un requerimiento aparte". Este
  requerimiento es ese aparte, específicamente para `canciones`.
- El backend YA tiene un `SongsModule` parcial (`ApprendeVr/backend/src/songs/`), creado por el
  Requerimiento 004 y ampliado en la sesión actual:
  - `entities/song.entity.ts` mapea `canciones_vr` completa: `id`, `title`, `author`, `fileName`,
    `dateTime` (`fecha_hora_cancion`, nullable, default de BD), `language` (`idioma_cancion`,
    nullable, default de BD `'ingles'`).
  - `dto/create-song.dto.ts` y `dto/update-song.dto.ts` ya existen con `class-validator`
    (`title`/`fileName` obligatorios, `author`/`language` opcionales) y sus `.spec.ts`.
  - `songs.service.ts` solo tiene `findByFileName()` (usado por `WordsModule`/`PhrasesModule` para
    resolver `id_cancion` a partir del nombre de archivo). **No tiene `create()` ni `findAll()`.**
  - **No existe `songs.controller.ts`**: hoy no hay ninguna ruta HTTP `/songs` expuesta.
  - `SongsModule` no se importa directo en `AppModule`, pero sí transitivamente (`WordsModule` y
    `PhrasesModule` lo importan) — alcanza con agregar el controller al `SongsModule` existente,
    no hace falta tocar `AppModule`.
- Referencia de comportamiento legado: `A-frame/Proyecto/backend/modelos/canciones/
  registrar_canciones.php` (PHP, tabla `canciones_vr` con `UNIQUE KEY (titulo_cancion,
  autor_cancion)`) — al recibir `titulo`+`archivo` (y opcionalmente `autor`/`idioma`) hace un
  upsert: si ya existe una canción con el mismo título+autor, actualiza `archivo_cancion`/
  `idioma_cancion` en vez de fallar. `idioma` por defecto `'ingles'` si no se envía.
- Patrón de cliente HTTP ya usado en esta misma vista para otro backend propio de ApprendeVr:
  `vrUserSettingsApi.util.js` — lee el JWT de `getStoredAuth()` (`vrAuth.util.js`), hace `fetch()`
  a `/api/...` con `Authorization: Bearer`, y en caso de error de red o sin sesión hace un no-op
  silencioso con `console.warn` (no rompe la vista si el backend no responde).

## 3. Historias de usuario

- Como usuario logueado en la vista de karaoke VR, quiero agregar una canción nueva desde el panel
  "New Song", para que quede disponible en el catálogo de canciones aunque cierre el navegador o
  la abra otra persona.
- Como usuario de la vista de karaoke VR, quiero ver en la lista de canciones las que agregaron
  otros usuarios (no solo las que yo agregué en mi navegador), para poder cantarlas igual que las
  canciones precargadas.
- Como usuario que intenta agregar una canción con el mismo título y autor que una ya existente,
  quiero que el sistema me avise en vez de crear un duplicado, para mantener el catálogo limpio.
- Como usuario sin conexión al backend (red caída, certificado HTTPS no confiado en el
  dispositivo), quiero que el panel me avise que no se pudo guardar en vez de fallar en silencio o
  perder lo que escribí, para saber que debo reintentar.

## 4. Alcance

### Incluido

- **Backend — `SongsModule`:**
  - `SongsService.create(dto: CreateSongDto)`: valida duplicado por `title`+`author` (equivalente
    a la `UNIQUE KEY` legacy, pero verificado en la app vía `findOne`, no como constraint de BD —
    ver "Diseño técnico") y guarda la canción.
  - `SongsService.findAll()`: lista todas las canciones (`ORDER BY id`), para que el frontend deje
    de depender solo de `videoList` + `localStorage`.
  - Funciones puras en `songs.util.ts` (normalización de `title`/`author`: trim + colapsar
    espacios, y armado del criterio de duplicado), con su `.spec.ts`.
  - `SongsController` (`@Controller('songs')`): `GET /api/songs` (público, sin guard — el catálogo
    no es un dato por-usuario), `POST /api/songs` (protegido con `JwtAuthGuard`, igual que
    `user-settings` — requiere sesión para escribir, no para leer).
  - `songs.controller.spec.ts` y ampliar `songs.service.spec.ts` (mock del repo).
- **Frontend:**
  - `vrSongsApi.util.js` (nuevo, mismo patrón que `vrUserSettingsApi.util.js`): `getSongs()` (GET,
    sin auth) y `createSong({ title, author, fileName, language })` (POST, con
    `Authorization: Bearer` desde `getStoredAuth()`).
  - `VRNewSongAf._saveSong()`: llama a `createSong(...)` en vez de `addLocalSong(...)`; muestra el
    mensaje de éxito/error que devuelva el backend (incluido el caso de duplicado); si la llamada
    falla por red, cae a `addLocalSong(...)` como respaldo local (no se pierde lo escrito) y lo
    indica en el `status` del panel.
  - `VRKaraokeAf._initSongList()`: intenta `getSongs()` primero; si responde, arma la lista desde
    el backend (combinando con lo que quede en `localStorage` como respaldo de la sesión actual
    que aún no se sincronizó); si falla, cae al comportamiento actual (`videoList` +
    `getLocalSongs()`).
- **Documentación:** actualizar `ApprendeVr/Documentation/backend-nestjs.md` con las rutas nuevas.

### No incluido

- `PATCH /songs/:id` y `DELETE /songs/:id` (editar/borrar canciones): quedan pendientes para otro
  requerimiento, no bloquean el flujo de alta.
- Agregar la `UNIQUE KEY (title, author)` como constraint real de la tabla vía migración TypeORM:
  la unicidad se valida en `SongsService.create` (lectura antes de insertar), no en el esquema —
  evita tocar `synchronize`/migraciones en este requerimiento.
- Subida real del archivo de video (multipart upload): `fileName` sigue siendo solo el nombre de
  un archivo que el usuario ya copió manualmente a `public/videos/karaoke/` (mismo supuesto que
  hoy); no se construye un endpoint de subida de video.
- Persistir la URL de YouTube (campo `youtubeUrl` del panel): no existe columna para eso en
  `canciones_vr`; sigue siendo solo una previsualización client-side (`window.open`).
- Endpoint de streaming de video (`VideosModule`, `GET /videos/:fileName` con `Range`): es un
  módulo propio ya descrito en el Requerimiento 004 (fase 7), independiente de este.
- Roles/permisos distintos entre usuarios para agregar canciones (por ejemplo, solo admins): por
  ahora cualquier usuario autenticado puede agregar — ver Requerimiento 005 (roles) si esto debe
  restringirse más adelante.

## 5. Diseño técnico

**GET /songs público vs. protegido.** Se eligió sin `JwtAuthGuard`: el catálogo de canciones no es
un dato por-usuario (a diferencia de `user-settings`), y `VRKaraokeAf` debe poder mostrar la lista
apenas carga la vista, sin depender de que ya exista una sesión activa.

**POST /songs protegido con `JwtAuthGuard`.** El PHP legacy no exigía autenticación, pero
ApprendeVr ya tiene login real (Requerimiento 007) y el resto de escrituras del backend
(`user-settings`, `evaluations` cuando exista) lo requieren; dejar el alta de canciones abierta a
anónimos sería inconsistente con el resto de la API.

**Unicidad validada en el service, no en la BD.** El dump legacy tiene `UNIQUE KEY (titulo_cancion,
autor_cancion)`, pero la tabla real importada en Docker (`english_vr.sql` actual, sin esa
constraint — ver sección 2) no la trae, y agregarla implica una migración TypeORM (`synchronize:
false`). Para no bloquear este requerimiento con trabajo de migraciones, `SongsService.create`
hace un `findOne({ title, author })` antes de insertar y devuelve un error controlado (409) si ya
existe, dejando la constraint de BD como mejora futura opcional.

**Sin upsert (a diferencia del legacy).** El PHP actualizaba `archivo_cancion`/`idioma_cancion` si
la canción ya existía. Se decidió no replicar eso: un `POST /songs` duplicado devuelve error en
vez de sobrescribir en silencio una canción existente, para que el usuario vea explícitamente el
conflicto (consistente con el resto de la API REST del backend, que no hace upserts en otros
dominios).

**Frontend con degradación a `localStorage`.** Se mantiene `vrSongCatalog.util.js` como respaldo
(no se borra), para que una canción escrita por el usuario no se pierda si el backend no responde
(HTTPS autofirmado no confiado en el dispositivo, red caída) — mismo patrón defensivo que ya usa
`vrUserSettingsApi.util.js`.

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `ApprendeVr/backend/src/songs/songs.service.ts` | Agregar `create()` y `findAll()`. |
| `ApprendeVr/backend/src/songs/songs.service.spec.ts` | Tests de `create()`/`findAll()` (repo mockeado), incluido el caso de duplicado. |
| `ApprendeVr/backend/src/songs/songs.util.ts` | Nuevo: funciones puras de normalización de `title`/`author` y armado del criterio de duplicado. |
| `ApprendeVr/backend/src/songs/songs.util.spec.ts` | Nuevo: tests de las funciones puras. |
| `ApprendeVr/backend/src/songs/songs.controller.ts` | Nuevo: `GET /songs` (público), `POST /songs` (`JwtAuthGuard`). |
| `ApprendeVr/backend/src/songs/songs.controller.spec.ts` | Nuevo: verifica que delega al service con los argumentos correctos. |
| `ApprendeVr/backend/src/songs/songs.module.ts` | Registrar `SongsController`. |
| `ApprendeVr/backend/src/songs/dto/create-song.dto.ts` | Ya existe (creado junto con este requerimiento). |
| `ApprendeVr/backend/src/songs/entities/song.entity.ts` | Ya actualizado (`dateTime`, `language`). |
| `ApprendeVr/frontend/src/views/A-frame/vrSongsApi.util.js` | Nuevo: cliente `getSongs()`/`createSong()`, patrón de `vrUserSettingsApi.util.js`. |
| `ApprendeVr/frontend/src/views/A-frame/components/VRKaraokeAf/components/VRNewSongAf/VRNewSongAf.js` | `_saveSong()` llama a `createSong()`, con respaldo a `addLocalSong()` si falla. |
| `ApprendeVr/frontend/src/views/A-frame/components/VRKaraokeAf/VRKaraokeAf.js` | `_initSongList()` intenta `getSongs()` antes de usar `videoList`/`localStorage`. |
| `ApprendeVr/Documentation/backend-nestjs.md` | Documentar rutas `GET/POST /api/songs`. |

## 7. Criterios de aceptación

- [ ] `npm run build` y `npm test` (backend) pasan sin levantar MySQL.
- [ ] `GET /api/songs` devuelve las canciones del dump (`Stand By Me`, `its My Life`, `Gangstas
      Paradise`) más cualquiera creada en la sesión de pruebas.
- [ ] `POST /api/songs` sin `Authorization` devuelve `401`.
- [ ] `POST /api/songs` con sesión válida y `{ title, fileName }` (sin `author`/`language`) crea la
      canción y la BD completa `idioma_cancion`/`fecha_hora_cancion` con sus defaults.
- [ ] `POST /api/songs` con el mismo `title`+`author` que una canción existente devuelve un error
      controlado (no un 500, no un duplicado silencioso).
- [ ] Desde el panel `VRNewSongAf` en el navegador: agregar una canción nueva, refrescar la
      página, y verla en la lista de `VRKaraokeAf` (prueba de que quedó en BD, no solo en
      `localStorage` de esa pestaña).
- [ ] Con el backend apagado, agregar una canción desde `VRNewSongAf` sigue guardándola en
      `localStorage` (respaldo) y el panel muestra un aviso de que no se pudo sincronizar.
- [ ] `npm run test:cov` (backend) no baja la cobertura global de 80% con los archivos nuevos.

## 8. Referencias

- Requerimiento 004 (`2-Developing/004-backend-nestjs-arquitectura-crud`): diseño original de
  `SongsModule` y su checklist (fase 5.1).
- Requerimiento 009 (`3-Completed/009-vista-aframe-evaluacion-canciones`): decisión original de
  diferir la persistencia de canciones ("No incluido").
- Requerimiento 010 (`3-Completed/010-configuraciones-usuario-por-vista`): patrón de cliente HTTP
  con JWT desde una vista A-Frame (`vrUserSettingsApi.util.js`).
- `A-frame/Proyecto/backend/modelos/canciones/registrar_canciones.php`: comportamiento legado de
  alta de canciones (referencia funcional, no se porta tal cual — ver "Diseño técnico").
- `A-frame/Proyecto/BaseDatos/english_vr.sql`: esquema real de `canciones_vr`.

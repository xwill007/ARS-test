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
- **Ampliación: "Archivo local" desde el dispositivo — video sin subir al servidor, metadata SÍ en
  BD.** Pedido del usuario, en dos pasos (la segunda vuelta cambió el diseño de la primera): en vez
  de tener que copiar a mano un video a `public/videos/karaoke/` antes de poder escribir su nombre
  en el campo "Archivo local", el icono "P" de ese campo específico abre el selector de archivos
  nativo del sistema operativo (`<input type="file" accept="video/*">`). El contenido binario del
  video **nunca sale del dispositivo** ("no se requiere subir al servidor"), pero la canción sí
  queda registrada en `canciones_vr` ("se debe registrar en db para que se muestre en la lista de
  canciones") — así aparece en la lista de forma persistente (sobrevive a recargar la página o
  borrar `localStorage`) en vez de vivir solo en el navegador. Como el video no está en el
  servidor, solo se puede reproducir en el dispositivo donde se agregó — ver `id_usuario_cancion`
  más abajo para cómo se filtra.
  - **Renombre de `fuente_cancion` (pedido del usuario):** el valor que hasta ahora se llamaba
    `'local'` (archivo real en `public/videos/karaoke/` del servidor) pasa a llamarse **`'server'`**
    — libera el nombre `'local'` para el significado nuevo ("video que vive solo en el dispositivo
    del usuario"). `'youtube'` no cambia de nombre. Ver `db/011-songs-id-usuario.sql` para la
    migración que renombra las filas existentes.
  - **Regla de visibilidad (pedido explícito del usuario, ampliación sobre el diseño original):**
    `source: 'server'` es **pública** — la ve cualquier usuario (`GET /songs`). `source: 'local'` Y
    `source: 'youtube'` son **privadas** — cada una solo la ve el usuario que la registró
    (`GET /songs/mine`). El diseño original solo hacía privada a `'local'`; el usuario pidió
    explícitamente extender esa privacidad a `'youtube'` también.
  - **Columna nueva `id_usuario_cancion`** en `canciones_vr` (nullable, `FOREIGN KEY` a
    `usuarios(id)` ON DELETE SET NULL — nombre con el sufijo `_cancion` para seguir la convención
    de esta tabla, `titulo_cancion`/`autor_cancion`/etc.): relaciona cada canción con el usuario
    que la creó. Se completa para **cualquier** canción creada vía `POST /songs` (no solo las
    privadas), tomado del usuario autenticado (`@CurrentUser()`), nunca del body de la petición
    (evita que alguien falsifique el autor). Es la clave que permite filtrar "las canciones
    privadas DE ESTE usuario".
  - **`GET /songs/mine`** (nuevo, protegido con `JwtAuthGuard`): devuelve las canciones
    `source IN ('local', 'youtube')` del usuario autenticado. `GET /songs` (`findAll()`) solo
    devuelve `source: 'server'` — `VRKaraokeAf._initSongList()` combina ambos endpoints para armar
    la lista completa.
  - **Hallazgo real: el dump legacy tenía una `UNIQUE KEY (titulo_cancion, autor_cancion)` real**
    (`unique_song`, `english_vr.sql` línea ~1124) — contradice lo documentado originalmente en esta
    misma sección ("la tabla real... sin esa constraint"), nunca verificado contra el dump real en
    su momento. Esa constraint global rompía el pedido de que dos usuarios puedan tener cada uno
    una canción privada con el mismo título+autor sin conflicto: el `INSERT` fallaba con un error
    crudo de MySQL aunque el chequeo de la app (acotado por usuario) no viera duplicado. Se elimina
    con `db/012-songs-drop-unique-song.sql`, dejando a la aplicación como única fuente de verdad de
    unicidad (que es lo que ya decía, incorrectamente, la sección 5 desde el principio).
  - `vrLocalVideoStore.util.js` (nuevo, frontend): guarda/lee el contenido binario del video en el
    `IndexedDB` de este navegador (como `ArrayBuffer`, por compatibilidad con Safari/iOS viejo),
    clave = nombre de archivo saneado (que además es, tal cual, el `fileName` que viaja al
    backend). Elegido sobre `localStorage` (límite ~5-10MB, insuficiente para un video) y sobre
    subir el archivo al servidor (pedido explícito: sin servidor) — funciona igual en navegadores
    de escritorio y móviles.
  - `VRNewSongAf.js`: el icono "P" del campo `archivo` dispara el selector de archivos en vez de
    pegar portapapeles (los demás campos mantienen el paste); al elegir un video, lo guarda en
    `vrLocalVideoStore.util.js` y marca `this._values.archivo` con el prefijo `device:`.
    `_saveSong()` detecta ese prefijo, arma `source: 'local'` y llama a `createSong(...)` con el
    mismo camino unificado que 'server'/'youtube' (incluido el respaldo a `addLocalSong()` si la
    red falla) — ya no hay una rama aparte que se salte el backend.
  - `VRKaraokeAf.js`: `_initSongList()` combina `getSongs()` + `getMySongs()` (nuevo, en
    `vrSongsApi.util.js`) para armar la lista completa — no requirió más cambios que ese al pasar
    `'youtube'` de pública a privada, porque `getMySongs()`/`GET /songs/mine` ya devuelve ambas
    fuentes privadas juntas. Las canciones `source: 'local'` se identifican en la UI con un color
    distinto y el prefijo "[Local]" (mismo criterio visual que ya existe para "[YouTube]"). Al
    seleccionarlas, `_playDeviceSong()` lee el Blob desde `IndexedDB` (por el mismo valor que el
    backend guardó como `fileName`), arma un `Object URL` (`URL.createObjectURL`) y lo reproduce
    con el mismo camino de textura 3D (`<a-video>`) que un archivo `'server'` — si el Blob no está
    en este dispositivo (se agregó desde otro), muestra un aviso en vez de fallar en silencio.
  - **Autocompletar Título/Autor desde el nombre del archivo (pedido del usuario):** al elegir un
    archivo cuyo nombre trae un `-` (ej. `"Stand By Me - Ben E King.mp4"`), la parte antes del
    primer `-` completa "Título" y la parte después completa "Autor" — solo si esos campos están
    vacíos (nunca pisa lo que el usuario ya haya escrito a mano). Sin `-` en el nombre, solo
    completa "Título" con el nombre completo (sin extensión).
- **Lista de canciones (`VRKaraokeAf`): muestra título/artista/ubicación, nunca la URL/ruta de
  archivo (pedido del usuario).** Cada fila mostraba antes el `fileName` crudo como "nombre" de la
  canción — para `'youtube'`, la URL completa sin recortar. Ahora la fila principal muestra el
  título real (`s.title`, guardado en la BD) y la fila secundaria muestra `<artista> · <ubicación>`
  (`Servidor`/`Local`/`YouTube`, según `source`) en vez de artista+duración (la duración nunca la
  llegó a completar el backend). `fileName` sigue existiendo solo como dato interno de selección/
  reproducción, nunca se renderiza.

- **Overlay "New Song" independiente de "karaoke" (pedido del usuario, AR-SYNC/`mirror-fix`).**
  `#new-song-component` deja de ser una entidad más dentro del iframe del overlay "karaoke" — pasa
  a ser su propio overlay (`newSong`), siguiendo el skill `overlay-ar-sync-aframe` (mismo patrón
  `src` real que "karaoke"): `new-song.html`/`new-song-modules.js`/`VRNewSongOverlaySync.jsx`,
  registrado en `SYNCABLE_OVERLAYS`/`OVERLAY_OPTIONS`/locales/`ARS_SYNC_OVERLAY_KEYS` (backend). Se
  llevan consigo el puente de campos ("New Song"), el envío de `cancion-agregada` y una copia
  simplificada del sistema de gaze/dwell/click. El aviso de "canción agregada" ya no se puede
  relayar "al panel opuesto" (mismo overlay) — necesita un fan-out explícito a las 4 combinaciones
  de panel × "karaoke" en `SyncStereoTestView.jsx` (ver "Diseño técnico" y `problems_solutions.md`
  #9).

### No incluido

- `PATCH /songs/:id` y `DELETE /songs/:id` (editar/borrar canciones): quedan pendientes para otro
  requerimiento, no bloquean el flujo de alta.
- Agregar la `UNIQUE KEY (title, author)` como constraint real de la tabla vía migración TypeORM:
  la unicidad se valida en `SongsService.create` (lectura antes de insertar), no en el esquema —
  evita tocar `synchronize`/migraciones en este requerimiento.
- Subida real del archivo de video al servidor (multipart upload a `public/videos/karaoke/`): sigue
  sin existir un endpoint de subida — para una canción `source: 'server'` (visible/reproducible
  para todos los usuarios; este es el valor que hasta la ampliación de "Archivo local" se llamaba
  `'local'`), `fileName` sigue siendo solo el nombre de un archivo que alguien ya copió manualmente
  a `public/videos/karaoke/`. La ampliación de "Archivo local desde el dispositivo" (ver
  "Incluido") es un mecanismo **distinto y deliberadamente no equivalente**: el video no sale nunca
  del dispositivo del usuario (vive en su `IndexedDB`, no en el servidor) — solo la metadata
  (título/autor/`fileName`/`id_usuario_cancion`) llega a la BD — así que la canción sigue sin ser
  reproducible para otros usuarios/dispositivos; sigue sin resolver "quiero que mi canción se vea/se
  reproduzca para todos", que requeriría la subida real acá descartada.
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

**Unicidad validada en el service, no en la BD.** `SongsService.create` hace un
`findOne({ title, author, ...})` antes de insertar y devuelve un error controlado (409) si ya
existe, en vez de depender de una constraint de esquema.
**Corrección (Requerimiento 014, ampliación):** esta sección afirmaba originalmente que el dump
real importado en Docker (`english_vr.sql`) NO traía la `UNIQUE KEY (titulo_cancion,
autor_cancion)` del legacy — resultó ser una suposición nunca verificada, y era falsa: el dump SÍ
la trae (línea ~1124), con el nombre `unique_song`. Se detectó recién al implementar la regla de
que dos usuarios distintos puedan repetir título+autor en una canción privada (`'local'`/
`'youtube'`) sin conflicto — el `INSERT` fallaba con un error crudo de MySQL aunque el chequeo de
la app no viera duplicado. Se corrige eliminando esa constraint (`db/012-songs-drop-unique-song.sql`),
dejando ahora sí a la aplicación como única fuente de verdad de unicidad — lo que este párrafo
pretendía describir desde el principio.

**Sin upsert (a diferencia del legacy).** El PHP actualizaba `archivo_cancion`/`idioma_cancion` si
la canción ya existía. Se decidió no replicar eso: un `POST /songs` duplicado devuelve error en
vez de sobrescribir en silencio una canción existente, para que el usuario vea explícitamente el
conflicto (consistente con el resto de la API REST del backend, que no hace upserts en otros
dominios).

**Frontend con degradación a `localStorage`.** Se mantiene `vrSongCatalog.util.js` como respaldo
(no se borra), para que una canción escrita por el usuario no se pierda si el backend no responde
(HTTPS autofirmado no confiado en el dispositivo, red caída) — mismo patrón defensivo que ya usa
`vrUserSettingsApi.util.js`.

**"Archivo local desde el dispositivo": `IndexedDB` para el video, BD para la metadata (decisión
tomada con el usuario, en dos vueltas).** Para el CONTENIDO del video, tres opciones evaluadas: (1)
subir el archivo a un endpoint del backend y guardarlo en `public/videos/karaoke/` — descartada, el
usuario pidió explícitamente "no se requiere subir al servidor"; (2) guardarlo en `localStorage`
junto al resto del catálogo — descartada, límite típico de 5-10MB por origen, muy por debajo del
tamaño de un video; (3) `IndexedDB`, que sí soporta blobs grandes y está disponible tanto en
navegadores de escritorio como móviles (requisito explícito: "que además funcione en dispositivo
mobil") — elegida, sin cambios en la segunda vuelta. Se guarda como `ArrayBuffer` en vez de
`Blob`/`File` directo por compatibilidad con versiones viejas de Safari/iOS, que tuvieron bugs
conocidos persistiendo blobs tal cual.

Para la METADATA (título/autor/`fileName`), la primera versión de este requerimiento la guardaba
también 100% en `localStorage` (`vrLocalDeviceSongs.util.js`, catálogo separado de
`vrSongCatalog.util.js`) — el usuario pidió después explícitamente que se registre en la BD "para
que se muestre en la lista de canciones" (persistir en `localStorage` es frágil: se pierde al
limpiar datos del sitio o cambiar de navegador, y no sobrevive un `docker compose down`+`up` del
backend si en algún momento se migra esa lógica). Se descarta mantener las dos fuentes de verdad
(BD + `localStorage`) por separado — mezclar "algunas canciones locales en BD, otras en
`localStorage`" sería más confuso que consistente. `vrLocalDeviceSongs.util.js` se elimina: la
metadata de una canción `'local'` ahora es una fila más de `canciones_vr` (vía el mismo
`POST /songs` que ya usan `'server'`/`'youtube'`), y solo el Blob del video sigue siendo
exclusivamente de `IndexedDB`.

**Columna `id_usuario_cancion`, no un catálogo separado por dispositivo.** Para saber a quién
pertenece cada canción privada (y así decidir qué mostrarle a quién en `GET /songs/mine`), se
evaluó identificar el dispositivo (ej. un ID generado y guardado en `localStorage`) en vez del
usuario — descartada: un ID de dispositivo no sobrevive a limpiar `localStorage` ni identifica a la
persona si usa varios dispositivos con la misma cuenta, y el backend ya tiene un concepto de
usuario autenticado real (JWT) que resuelve esto sin inventar un mecanismo nuevo.
`id_usuario_cancion` se completa para toda canción creada vía `POST /songs` (no solo las privadas)
porque "relacionar las canciones por usuario" (pedido del usuario) es útil en general (autoría/
auditoría), no solo para el filtro de privacidad. Nombre con sufijo `_cancion` (no `id_usuario` a
secas): sigue la convención de las demás columnas propias de esta tabla.

**Regla de visibilidad: `'server'` pública, `'local'` Y `'youtube'` privadas (pedido explícito del
usuario, ampliación sobre el diseño original).** La primera versión de esta ampliación solo hacía
privada a `'local'` (razón técnica: el video no está en el servidor, así que mostrarla a otros
usuarios los llevaría a un video roto). El usuario pidió después, explícitamente, que `'youtube'`
también sea privada — a diferencia de `'local'`, una canción `'youtube'` SÍ es reproducible por
cualquiera (es una URL, no un archivo local), así que esto no es una limitación técnica sino una
decisión de producto (cada usuario arma su propia lista de YouTube, no un catálogo compartido).
`SongsService` trata ambas fuentes de forma simétrica (`PRIVATE_SOURCES = ['local', 'youtube']`)
en `findMine()` y en el criterio de duplicado de `create()`.

**Renombre de `fuente_cancion`: `'local'` (archivo de servidor) → `'server'`, no un tercer valor
nuevo para "archivo de dispositivo".** Se evaluó agregar un valor nuevo (ej. `'device'`) y dejar
`'local'` con su significado original, para no tocar filas existentes — descartada: el usuario pidió
explícitamente "en fuente cancion guarda local" para el video de dispositivo, dejando en claro que
`'local'` debía significar eso de ahora en más; mantener el significado viejo hubiera contradicho el
pedido. La migración (`db/011-songs-id-usuario.sql`) renombra las filas existentes de `'local'` a
`'server'` ANTES de cambiar el `DEFAULT` de la columna, para que ninguna fila vieja quede con un
valor que ya cambió de significado.

**Canciones `'youtube'` preexistentes sin `id_usuario_cancion`: backfileadas a mano al usuario de
prueba (pedido explícito del usuario, esta sesión).** Las 2 canciones `'youtube'` que ya existían
en la BD antes de esta columna (`id_cancion` 257/259) se crearon sin ningún usuario asociado —
`UPDATE canciones_vr SET id_usuario_cancion = 31 WHERE fuente_cancion = 'youtube' AND
id_usuario_cancion IS NULL`, ejecutado directo contra la BD de desarrollo (usuario 31 =
`prueba@gmail.com`, el usuario de prueba de este entorno). Sin este backfill hubieran quedado
huérfanas e invisibles para cualquier usuario bajo la nueva regla de privacidad (`id_usuario_cancion
IS NULL` no calza con ningún `userId` real en `findMine()`).

**Sin control de acceso a "elegir la carpeta de Descargas" por defecto.** No existe una API web
estándar (soportada en todos los navegadores/dispositivos) para abrir el selector de archivos ya
posicionado en una carpeta específica — se usa `<input type="file" accept="video/*">` liso, que en
la práctica suele abrir en la última carpeta usada por el navegador (a menudo Descargas, tras
bajar un video), pero no se puede forzar ni garantizar.

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
| `ApprendeVr/backend/db/011-songs-id-usuario.sql` | Nuevo: agrega `id_usuario_cancion` (FK a `usuarios`, `ON DELETE SET NULL`) a `canciones_vr`; renombra las filas `fuente_cancion='local'` a `'server'`; cambia el `DEFAULT` de la columna de `'local'` a `'server'`. Aplicada manualmente contra la BD de desarrollo en esta sesión. |
| `ApprendeVr/backend/db/012-songs-drop-unique-song.sql` | Nuevo: elimina la `UNIQUE KEY unique_song (titulo_cancion, autor_cancion)` heredada del dump legacy (hallazgo real, ver "Diseño técnico") — sin esto, dos usuarios no pueden tener una canción privada con el mismo título+autor. Aplicada manualmente contra la BD de desarrollo en esta sesión. |
| `ApprendeVr/backend/docker-compose.yml` | Montar `db/011-songs-id-usuario.sql` y `db/012-songs-drop-unique-song.sql` como scripts de init nuevos. |
| `ApprendeVr/backend/src/songs/entities/song.entity.ts` | Agregar columna `userId` (`id_usuario_cancion`); actualizar default de `source` a `'server'`. |
| `ApprendeVr/backend/src/songs/dto/create-song.dto.ts` | `SONG_SOURCES` pasa de `['local', 'youtube']` a `['server', 'local', 'youtube']` (nuevo significado de `'local'`; `'youtube'` pasa de pública a privada). |
| `ApprendeVr/backend/src/songs/songs.service.ts` | `findAll()` devuelve solo `source: 'server'`; nuevo `findMine(userId)` (`source IN ('local','youtube')`); `create(dto, userId)` ahora recibe `userId` (del usuario autenticado, no del DTO) y lo guarda siempre; duplicado se acota por `userId` cuando `source` es `'local'`/`'youtube'` (`PRIVATE_SOURCES`). |
| `ApprendeVr/backend/src/songs/songs.service.spec.ts` | Tests de `findAll`/`findMine`, `create` con `userId`, y duplicado acotado por usuario para ambas fuentes privadas. |
| `ApprendeVr/backend/src/songs/songs.controller.ts` | Nuevo `GET /songs/mine` (`JwtAuthGuard`, `@CurrentUser()`, delega a `findMine`); `POST /songs` ahora pasa `user.id` a `create()`. |
| `ApprendeVr/backend/src/songs/songs.controller.spec.ts` | Tests de `findMine` y `create` con el usuario autenticado. |
| `ApprendeVr/frontend/src/views/A-frame/vrLocalVideoStore.util.js` | Nuevo: guarda/lee el binario del video en `IndexedDB` (`saveLocalVideo`/`getLocalVideo`/`deleteLocalVideo`). |
| `ApprendeVr/frontend/src/views/A-frame/vrSongsApi.util.js` | Nuevo `getMySongs()` (GET `/api/songs/mine`, con auth, devuelve `[]` sin sesión/con error). |
| `ApprendeVr/frontend/src/views/A-frame/components/VRKaraokeAf/components/VRNewSongAf/VRNewSongAf.js` | Icono "P" del campo `archivo` abre el selector de archivos nativo en vez de pegar portapapeles; guarda el video elegido en `vrLocalVideoStore.util.js`; `_saveSong()` unifica `'server'`/`'local'`/`'youtube'` en un solo llamado a `createSong()` (ya no hay una rama que se salte el backend); nuevo `parseTitleArtistFromFileName()` autocompleta Título/Autor desde el nombre del archivo elegido (corta en el primer `-`), sin pisar campos ya escritos. |
| `ApprendeVr/frontend/src/views/A-frame/components/VRKaraokeAf/VRKaraokeAf.js` | `_initSongList()` combina `getSongs()` + `getMySongs()`, y agrega `s.title` como 3er campo de la entrada pipe-delimited; nuevo método `_playDeviceSong()` (lee el Blob de `IndexedDB` por el mismo `fileName` de la BD, arma un Object URL, reproduce vía `loadVideo()`); `loadVideo()`/`_stopLocalPlayback()` liberan el Object URL al cambiar de canción; renombrado el branching de `'device'`/`'local'`(servidor) a `'local'`/`'server'`; `_buildSongListUI()` muestra título+`SOURCE_LABELS` (`Servidor`/`Local`/`YouTube`) en vez de `fileName`+duración. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/aframe-overlay-modules.js`/`.html` | Se quita `#new-song-component` (movido a su propio overlay, ver abajo); el receptor de `cancion-agregada` se mantiene, llama `_initSongList()` del `vr-karaoke-af` local. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/new-song.html` | Nuevo: página Vite real del overlay "New Song" independiente. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/new-song-modules.js` | Nuevo: importa `VRNewSongAf.js` real; puentes de cámara/campos/`cancion-agregada` (envío) + gaze/dwell/click propio. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/VRNewSongOverlaySync.jsx` | Nuevo: `forwardRef`, monta `new-song.html` en `<iframe src>` real. |
| `ApprendeVr/frontend/vite.config.js` | Registrar `new-song.html`. |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncStereoTestView.jsx` | Agregar `newSong` a `SYNCABLE_OVERLAYS`; handler explícito de fan-out para `cancion-agregada` (antes del relevo genérico). |
| `ApprendeVr/frontend/src/views/ARs/ARScomponents/ARStest/mirror-fix/SyncConfigCompassMenu.jsx` | Agregar `newSong` a `OVERLAY_OPTIONS`. |
| `ApprendeVr/frontend/src/locales/{es,en,br}.json` | Claves `syncConfig.overlay.newSong`/`newSongShort`; ajustada la descripción de `karaoke` (ya no incluye "agregar canción"). |
| `ApprendeVr/backend/src/user-settings/user-settings.util.ts` | Agregar `newSong` a `ARS_SYNC_OVERLAY_KEYS`. |

## 7. Criterios de aceptación

- [x] `npm run build` y `npm test` (backend) pasan sin levantar MySQL.
- [x] `GET /api/songs` devuelve las canciones del dump (`Stand By Me`, `its My Life`, `Gangstas
      Paradise`) más cualquiera creada en la sesión de pruebas. Verificado con `curl` contra
      `docker compose up` real, y desde el navegador (`GET /api/songs` → 200 en `VRKaraokeAf`).
- [x] `POST /api/songs` sin `Authorization` devuelve `401`. Verificado con `curl`.
- [x] `POST /api/songs` con sesión válida y `{ title, fileName }` (sin `author`/`language`) crea la
      canción y la BD completa `idioma_cancion`/`fecha_hora_cancion` con sus defaults. Verificado
      con `curl` + consulta directa a MySQL — encontró y corrigió un bug real en el camino (ver
      `problems_solutions.md` #1: `language` quedaba `NULL` explícito en vez de aplicar el
      `DEFAULT` de la BD).
- [x] `POST /api/songs` con el mismo `title`+`author` que una canción existente devuelve un error
      controlado (no un 500, no un duplicado silencioso). Verificado con `curl` (`409
      SONG_ALREADY_EXISTS`).
- [ ] Desde el panel `VRNewSongAf` en el navegador: agregar una canción nueva, refrescar la
      página, y verla en la lista de `VRKaraokeAf` (prueba de que quedó en BD, no solo en
      `localStorage` de esa pestaña). **No verificado end-to-end por click real**: la pestaña de
      Chrome disponible pasó a una sesión de `mirror-fix` con cámara en vivo y se cortó la prueba
      por privacidad. Sí se confirmó que la vista carga sin errores y que `GET /api/songs`
      responde; la lógica de `_saveSong()` llama al mismo endpoint ya probado por `curl`.
- [ ] Con el backend apagado, agregar una canción desde `VRNewSongAf` sigue guardándola en
      `localStorage` (respaldo) y el panel muestra un aviso de que no se pudo sincronizar. **No
      verificado en vivo** por el mismo motivo — revisar manualmente antes de mover este
      requerimiento a `3-Completed`.
- [x] `npm run test:cov` (backend) no baja la cobertura global de 80% con los archivos nuevos
      (`src/songs/**` quedó en 100% statements/branches/functions/lines).
- [x] `npm run build` (frontend) compila sin errores con el archivo nuevo (`vrLocalVideoStore.util.js`)
      importado desde `VRNewSongAf.js`/`VRKaraokeAf.js`.
- [x] `npm run build`, `npm test` y `npm run test:cov` (backend) pasan tras las migraciones `011`
      (`id_usuario_cancion`, renombre `'local'`→`'server'`) y `012` (elimina `unique_song`),
      incluidos los tests de `findAll`/`findMine`, `GET /songs/mine` y `create` con `userId`
      (`src/songs/**` sigue en 100% cobertura).
- [x] **Migraciones `011` y `012` aplicadas y verificadas contra la BD de desarrollo real en esta
      sesión** (`docker exec ... mysql ... < archivo.sql` contra el contenedor `Backend-ApprendeVr`
      corriendo — no requirió recrear el volumen). Confirmado con `DESCRIBE`/`SHOW CREATE TABLE`:
      las 3 canciones del dump quedaron con `fuente_cancion = 'server'`, la columna
      `id_usuario_cancion` existe con su FK, y `unique_song` ya no está.
- [x] `GET /api/songs` (público) devuelve solo las 3 canciones `'server'` del dump — nunca incluye
      canciones `'local'`/`'youtube'`. Verificado con `curl` contra el backend real levantado sobre
      la BD de desarrollo.
- [x] `GET /api/songs/mine` sin `Authorization` devuelve `401`. Con sesión válida (usuario de
      prueba, id 31), devuelve únicamente sus 2 canciones `'youtube'` preexistentes (backfileadas a
      su `id_usuario_cancion` en esta sesión, ver "Diseño técnico") — ninguna `'server'`. Verificado
      con `curl` real (login + `GET /songs/mine` con el JWT obtenido).
- [ ] `POST /api/songs` con sesión válida guarda `id_usuario_cancion` = el id del usuario
      autenticado, cualquiera sea el `source` enviado. **No verificado con un `POST` real en esta
      sesión** (sí verificado por lectura de código + los tests unitarios) — revisar manualmente
      antes de mover este requerimiento a `3-Completed`.
- [ ] Dos usuarios distintos pueden crear una canción `source: 'local'` (o `'youtube'`) con el mismo
      `title`+`author` sin `409` (el duplicado se acota por `userId`, y ya no existe la constraint
      `unique_song` que lo hubiera bloqueado a nivel de BD); repetir el mismo `title`+`author` con
      el MISMO usuario sí devuelve `409`. **No verificado con un `POST` real en esta sesión.**
- [ ] En el panel `VRNewSongAf`, click en el icono "P" del campo "Archivo local" abre el selector
      de archivos del sistema operativo (no pega el portapapeles, a diferencia de los demás
      campos). **No verificado en vivo** (click real pendiente, mismo motivo que el resto de
      criterios de UI de este requerimiento) — revisar manualmente antes de mover este
      requerimiento a `3-Completed`.
- [ ] Elegir un archivo de video ahí lo guarda en `IndexedDB` sin ninguna petición de red con el
      contenido del video (verificar en la pestaña Network) y completa el campo "Archivo local" con
      `device:<nombre-de-archivo>`.
- [ ] Al presionar "GUARDAR CANCION" con un archivo de dispositivo cargado (con sesión iniciada), se
      ve en Network un `POST /api/songs` con `source: 'local'` (sin el contenido del video, solo
      metadata) y la canción aparece en la lista de `VRKaraokeAf` con el prefijo "[Local]" y un
      color distinto, reproduciéndose correctamente (textura 3D `<a-video>`).
- [ ] Recargar la página mantiene la canción `'local'` en la lista (viene de `GET /songs/mine`, no
      de `localStorage`) y sigue reproduciéndose sin volver a elegir el archivo (el video sigue en
      `IndexedDB`).
- [ ] Abrir la misma cuenta desde OTRO navegador/dispositivo SÍ muestra la canción `'local'` en la
      lista (la metadata está en BD, ligada a `id_usuario_cancion`), pero al seleccionarla muestra
      el aviso de "video no disponible en este dispositivo" en vez de reproducir o romperse — el
      Blob nunca viajó ahí.
- [ ] Una canción `'youtube'` creada por el usuario A NO aparece en la lista del usuario B (privada,
      a diferencia del diseño original donde `'youtube'` era pública).
- [ ] Probado en un navegador móvil (Chrome Android o Safari iOS): elegir un video desde el
      selector de archivos, guardarlo y reproducirlo funciona igual que en desktop.
- [ ] Cada fila de la lista de `VRKaraokeAf` muestra `<índice>. <título real>` y
      `<artista> · <Servidor|Local|YouTube>` — en ningún caso aparece una URL ni un nombre/ruta de
      archivo en pantalla, incluida una canción `'youtube'` con una URL larga.
- [ ] Elegir un archivo `"Stand By Me - Ben E King.mp4"` en el selector de "Archivo local" completa
      Título = "Stand By Me" y Autor = "Ben E King" automáticamente; elegir uno sin `-` completa
      solo Título con el nombre completo (sin extensión); si Título/Autor ya tenían algo escrito a
      mano, elegir un archivo no lo pisa.
- [ ] En AR-SYNC (`mirror-fix`) con "Doble panel" activo: guardar una canción nueva desde el panel
      "New Song" de UN panel hace que aparezca en la lista de `VRKaraokeAf` de AMBOS paneles, sin
      recargar ninguno.
- [ ] El menú ⚙️ → "Overlays" de AR-SYNC muestra "New Song" como checkbox independiente de
      "Karaoke"; activar solo uno de los dos muestra únicamente ese panel. El panel "New Song"
      sigue funcionando igual que antes (teclado virtual, paste, selector de archivo local,
      guardar) y tiene su propio marcador 📍/d-pad de posición, movible y guardable por separado.

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

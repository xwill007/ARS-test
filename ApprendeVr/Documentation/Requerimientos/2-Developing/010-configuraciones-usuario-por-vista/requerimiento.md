# Requerimiento 010 — Tabla de configuraciones de usuario por vista, y persistir la posición de elementos ajustables (login 3D y vista A-Frame)

## 1. Objetivo

Crear una tabla en la base de datos (`english_vr`) para guardar configuraciones de usuario por
vista — una sola fila por usuario, con una columna JSON por vista — y usarla para persistir
posiciones ajustables en caliente que hoy se pierden al recargar la página: la del formulario de
login 3D (`UbicacionControl`, Requerimiento 007) y la de los elementos posicionables de la vista
A-Frame (`ApprendeVr/frontend/src/views/A-frame/index.html`: video, panel de karaoke, panel de
agregar canción — Requerimiento 009).

**Ampliación de alcance (post-creación):** el requerimiento se creó cubriendo solo el formulario
de login; el usuario pidió después agregar la misma funcionalidad de ajuste de posición a "todos
los elementos" de la vista A-Frame, antes de que se empezara a implementar. Se actualiza acá el
alcance/diseño para cubrir ambos de una vez, reusando la misma tabla e infraestructura de backend.

## 2. Antecedentes y estado actual

- El formulario de login/registro 3D (Requerimiento 007) se renderiza dentro de la escena vía
  `<Html transform occlude position={authPosition} distanceFactor={authDistanceFactor}>` en
  `ApprendeVr/frontend/src/App.jsx`. `authPosition` (`[x, y, z]`, default `[0, 1.6, 1]`) y
  `authDistanceFactor` (zoom, default `2.7`) son estado local de React
  (`App.jsx:40-44`), inicializado siempre con esos valores por defecto.
- Ya existe `ApprendeVr/frontend/src/components/UbicacionControl/UbicacionControl.jsx`: un control
  genérico (ícono 📍 + d-pad + zoom) que solo expone callbacks (`onMoveUp`, `onZoomIn`, etc.) — no
  conoce el sistema de coordenadas de quien lo usa. Está cableado a `authPosition`/
  `authDistanceFactor` en `App.jsx:259-267`, así que mover/hacer zoom con él sí cambia el
  formulario en pantalla, pero el ajuste no sobrevive a un refresh ni es por usuario: es una única
  variable de proceso del navegador, compartida por cualquiera que abra la app en ese momento.
- El backend NestJS (`ApprendeVr/backend/src`) tiene los módulos `auth` y `users`, con
  autenticación JWT ya funcionando: `GET /api/users/me` (protegido con `JwtAuthGuard` +
  `@CurrentUser()`, ver `users.controller.ts`) devuelve el usuario autenticado a partir del
  `Authorization: Bearer <token>` guardado en `localStorage['apprendevr_auth']` tras el login
  (mismo mecanismo ya usado por el Requerimiento 009 para mostrar el usuario real en los paneles
  de la vista A-Frame).
- La base de datos (`english_vr`, MySQL 8) no usa migraciones de TypeORM
  (`DatabaseModule` fuerza `synchronize: false` — el esquema no lo gestiona TypeORM). Las tablas
  existentes (`usuarios`, `canciones_vr`, `evaluaciones_vr`, `palabras_vr`, `frases_vr`) vienen del
  dump `A-frame/Proyecto/BaseDatos/english_vr.sql`, montado como script de inicialización de
  MySQL (`docker-entrypoint-initdb.d`) en `ApprendeVr/backend/docker-compose.yml` — ese script solo
  se ejecuta la primera vez que el volumen de datos está vacío, no en cada arranque del contenedor.
  No existe ningún otro mecanismo de migración en el backend (sin `typeorm migration:run` ni
  scripts SQL propios de ApprendeVr todavía): este requerimiento introduce el primero.

## 3. Historias de usuario

- Como estudiante, quiero que la posición y el zoom del formulario de login que dejé ajustados se
  mantengan la próxima vez que use la app, para no tener que reacomodarlo cada vez.
- Como estudiante, quiero poder reacomodar el video, el panel de canciones y el panel de agregar
  canción dentro de la escena VR, y que esos ajustes se mantengan la próxima vez que entre a esa
  vista, para no tener que reacomodarlos cada vez.
- Como estudiante, quiero que mis ajustes de posición sean míos (no los de cualquier otra persona
  que use la app), para que cada quien vea sus elementos donde los dejó.
- Como equipo de desarrollo, quiero un solo lugar en la base de datos donde guardar configuraciones
  de usuario por cada vista de la app, para no tener que crear una tabla nueva cada vez que una
  vista futura necesite guardar sus propios ajustes.

## 4. Alcance

### Incluido

- Crear la tabla `user_settings` en `english_vr`: una fila por usuario (`user_id` como clave
  primaria y foránea a `usuarios.id`), con una columna JSON por vista. Para este requerimiento se
  agregan dos columnas: `login_form_config` (formulario de login) y `aframe_view_config` (vista
  A-Frame) — ambas JSON, nullable. Nuevas vistas que necesiten guardar su propia configuración
  agregan su propia columna más adelante, sin rediseñar la tabla.
- Un script SQL propio de ApprendeVr (no se toca el dump legacy `A-frame/.../english_vr.sql`) que
  crea esa tabla, montado como segundo script de inicialización de Docker
  (`docker-entrypoint-initdb.d`) para que un volumen nuevo la cree automáticamente junto al resto
  del esquema.
- Módulo NestJS `user-settings` (`ApprendeVr/backend/src/user-settings/`) con:
  - `GET /api/user-settings/:view` — devuelve la configuración guardada de esa vista para el
    usuario autenticado (o `null` si nunca la guardó).
  - `PUT /api/user-settings/:view` — guarda (upsert) la configuración de esa vista para el usuario
    autenticado.
  - `:view` restringido a un listado fijo de vistas conocidas: `login-form` (→
    `login_form_config`) y `aframe-view` (→ `aframe_view_config`); pedir una vista no reconocida
    responde `400`.
- Adaptar `LoginRegisterForm`/`UbicacionControl` en `App.jsx`: al montar el formulario, cargar la
  posición/zoom guardados (si existen) en vez de usar siempre el default; al mover/hacer zoom con
  `UbicacionControl`, guardar el nuevo valor vía `PUT /api/user-settings/login-form`.
- **Vista A-Frame** (`ApprendeVr/frontend/src/views/A-frame/index.html`): agregar un control de
  posición equivalente a `UbicacionControl` (mismo icono 📍 + d-pad + zoom, pero implementado en
  JS plano — esta vista no usa React) para los tres elementos posicionables hoy hardcodeados en la
  escena: el video local (`#video-container`), el panel de karaoke (`#karaoke-vr-component`, que
  arrastra consigo la lista de canciones y los controles del reproductor, sus hijos) y el panel de
  agregar canción (`#new-song-component`). Al cargar la vista, si hay sesión y hay configuración
  guardada, se aplica sobre la posición hardcodeada del `index.html`; cada ajuste se guarda vía
  `PUT /api/user-settings/aframe-view` con las tres posiciones juntas en un solo JSON
  (`{ video: {x,y,z}, karaoke: {x,y,z}, newSong: {x,y,z} }`).
- El mundo (`vr-world`) y el usuario/cámara (`vr-user`) **no** se incluyen como elementos
  ajustables: el primero es el entorno de fondo (cielo/piso), sin una "posición" que tenga sentido
  reacomodar; el segundo ya se controla por movimiento del jugador, no por un ajuste de posición
  fijo como los paneles.
- Si el usuario no tiene sesión iniciada (no hay JWT en `localStorage['apprendevr_auth']`), ambos
  controles (login y vista A-Frame) siguen funcionando con los valores por defecto/en memoria, sin
  persistir nada (no tiene sentido guardar una configuración sin saber de qué usuario es).

### No incluido

- Un endpoint o UI genérica para administrar todas las configuraciones de un usuario a la vez
  (listar todas las vistas, borrarlas, etc.) — cada vista sigue pidiendo/guardando solo su propia
  columna.
- Migrar la gestión del esquema completo de `english_vr` a TypeORM migrations — este requerimiento
  solo agrega el primer script SQL propio de ApprendeVr, sin introducir un runner de migraciones
  general (se documenta como mejora futura si hacen falta más cambios de esquema).
- Sincronizar la configuración entre pestañas/dispositivos abiertos al mismo tiempo (si el usuario
  tiene la app abierta en dos lugares, el último `PUT` gana; no hay actualización en vivo del otro).
- Ajustar la rotación de los elementos de la vista A-Frame (solo posición `[x,y,z]`) — el video
  hoy tiene además `rotation`, pero se deja fija; si hace falta ajustarla también queda para una
  iteración futura.
- El panel de evaluación (`vr-evaluacion-af`) no es ajustable: se crea dinámicamente frente a la
  cámara al pulsar "EVALUATE SONG" (ver Requerimiento 009), no tiene una posición fija en la
  escena que tenga sentido guardar.
- Cualquier vista de configuración además de `login-form` y `aframe-view` — se agrega la
  columna/endpoint para otras vistas cuando esas vistas lo necesiten, no de forma especulativa
  ahora.

## 5. Diseño técnico

**Opciones consideradas para el esquema de la tabla:**

1. **Una tabla genérica clave-valor** (`user_settings(user_id, view, config_json)`, una fila por
   usuario+vista). Permite agregar vistas nuevas sin `ALTER TABLE`, pero el usuario pidió
   explícitamente "un solo registro por usuario" con "columnas diferentes" por vista — un
   key-value normalizado no es lo que se pidió, y complica la exclusividad de "una fila por
   usuario" (con key-value son N filas por usuario, una por vista usada).
2. **Una fila por usuario, una columna JSON por vista** (`user_settings(user_id PK/FK, login_form_config JSON, ...)`).
   **Elegida** — es literalmente lo pedido: un único registro por usuario, cada vista con su
   propia columna. Cuando una vista nueva necesite guardar configuración, se agrega su columna con
   un `ALTER TABLE ADD COLUMN`. Con MySQL 8 y pocas vistas (hoy 1, quizás unas pocas más a futuro)
   esto es simple y las columnas JSON siguen siendo consultables/indexables si hiciera falta.

**Opciones consideradas para los endpoints:**

1. **Un endpoint por vista** (`GET/PUT /api/user-settings/login-form`, y uno nuevo por cada vista
   futura). Cada vista nueva implica tocar el controller para agregar sus rutas.
2. **Rutas parametrizadas por `:view`** (`GET/PUT /api/user-settings/:view`), con un mapa fijo
   `view → columna` validado en el service (`login-form` → `login_form_config`). **Elegida**:
   agregar una vista nueva es agregar una entrada al mapa (y la columna en la entidad/tabla), sin
   tocar el controller. Pedir un `:view` no listado responde `400 Bad Request` con un mensaje
   explícito, en vez de fallar silenciosamente o inventar una columna.

**Opciones consideradas para el control de posición en la vista A-Frame:**

1. **Reusar el componente React `UbicacionControl` tal cual.** Descartada: la vista A-Frame
   (`views/A-frame/index.html`/`index.js`) es JS plano cargado por su propio `<script type="module">`,
   sin React ni ReactDOM montado en esa página — no hay dónde renderizar un componente React.
2. **Un único ícono 📍 fijo en una esquina de la página** (overlay HTML sobre el `<canvas>`, con un
   selector para elegir a qué elemento afecta) — implementada en una primera vuelta, pero
   **descartada tras feedback del usuario**: quería un control pegado a cada elemento (video,
   karaoke, agregar canción), no uno global compartido por los tres.
3. **Un marcador 📍 y d-pad por elemento, viviendo DENTRO de la escena como hijos de cada entidad**
   (`a-circle`/`a-plane` clickeables, mismo patrón de raycasting manual ya usado en
   `VRKaraokeAf`/`VRNewSongAf`). **Elegida**: al ser hijos del propio elemento (posición local), el
   marcador y su d-pad se mueven junto con él automáticamente — cada panel tiene su control
   pegado, igual que `UbicacionControl` está pegado al formulario de login, en vez de un control
   compartido en una esquina de la pantalla. Vive en `views/A-frame/vrPositionControl.js`
   (reemplaza la versión de la opción 2), con un raycast manual compartido (un solo listener de
   `pointerdown`, no uno por widget) para no triplicar código de raycasting.
4. **Guardado automático en cada click del d-pad vs. botón "GUARDAR" explícito.** Automático
   descartado tras feedback del usuario: cada movimiento del d-pad ahora solo actualiza la
   posición en memoria/pantalla; el registro en la base de datos ocurre recién al pulsar el botón
   GUARDAR de ese widget (evita además una llamada a la API por cada click mientras se ajusta).

**Migraciones:** sin runner de TypeORM migrations en el proyecto todavía (ver Antecedentes), se
sigue el mismo patrón ya usado para el esquema legacy: un archivo `.sql` montado como script de
inicialización de Docker. Se agrega `ApprendeVr/backend/db/001-user-settings.sql` (carpeta nueva,
propia de ApprendeVr, separada del dump legacy) y se monta en `docker-compose.yml` como
`02-user-settings.sql` en `docker-entrypoint-initdb.d`. **Importante:** como el volumen de MySQL
del entorno de desarrollo ya existe (se creó la primera vez que se levantó el contenedor), ese
script no se ejecuta solo — hay que aplicarlo a mano una vez contra el contenedor ya corriendo
(`docker exec -i Backend-ApprendeVr mysql -uroot english_vr < ApprendeVr/backend/db/001-user-settings.sql`)
o recrear el volumen. Se deja documentado en `checklist.md`.

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `ApprendeVr/backend/db/001-user-settings.sql` (nuevo) | `CREATE TABLE user_settings (user_id INT PRIMARY KEY, login_form_config JSON NULL, aframe_view_config JSON NULL, updated_at TIMESTAMP ..., FOREIGN KEY (user_id) REFERENCES usuarios(id))`. |
| `ApprendeVr/backend/docker-compose.yml` | Montar `db/001-user-settings.sql` como `02-user-settings.sql` en `docker-entrypoint-initdb.d`, junto al dump legacy ya montado. |
| `ApprendeVr/backend/src/user-settings/entities/user-settings.entity.ts` (nuevo) | Entidad TypeORM para `user_settings` (`userId` PK/FK, `loginFormConfig`, `aframeViewConfig`: `Record<string, unknown> \| null`, `updatedAt`). |
| `ApprendeVr/backend/src/user-settings/user-settings.util.ts` (+ `.spec.ts`, nuevos) | Funciones puras: mapa `view → columna` (`login-form`, `aframe-view`) y su validación, forma/parseo de cada payload (posición `[x,y,z]` + `distanceFactor` para `login-form`; `{video,karaoke,newSong}` con posición `[x,y,z]` cada uno para `aframe-view`). |
| `ApprendeVr/backend/src/user-settings/user-settings.service.ts` (+ `.spec.ts`, nuevo) | `getConfig(userId, view)` / `saveConfig(userId, view, config)`, usando el repo de `UserSettings` (upsert: crea la fila si no existe). |
| `ApprendeVr/backend/src/user-settings/user-settings.controller.ts` (+ `.spec.ts`, nuevo) | `GET`/`PUT /api/user-settings/:view`, protegidas con `JwtAuthGuard` + `@CurrentUser()`. |
| `ApprendeVr/backend/src/user-settings/dto/save-user-setting.dto.ts` (nuevo) | DTO validado con `class-validator` para el body del `PUT` (acepta el `config` como objeto genérico; la forma específica por vista la valida `user-settings.util.ts`). |
| `ApprendeVr/backend/src/user-settings/user-settings.module.ts` (nuevo) | Registra la entidad (`TypeOrmModule.forFeature`), controller y service. |
| `ApprendeVr/backend/src/app.module.ts` | Importar `UserSettingsModule`. |
| `ApprendeVr/frontend/src/App.jsx` | Cargar la config de `login-form` al abrir el formulario (si hay sesión) para inicializar `authPosition`/`authDistanceFactor`; guardar vía `PUT` en los handlers ya cableados a `UbicacionControl` (`onZoomIn`, `onMoveUp`, etc.). |
| `ApprendeVr/frontend/src/views/A-frame/vrPositionControl.js` (nuevo) | Un marcador 📍 + d-pad + botón GUARDAR por elemento (`#video-container`, `#karaoke-vr-component`, `#new-song-component`), como hijos 3D de cada entidad; carga `GET /api/user-settings/aframe-view` al iniciar y guarda con `PUT` solo al pulsar GUARDAR. |
| `ApprendeVr/frontend/src/views/A-frame/index.js` | Importar e inicializar `vrPositionControl.js` tras el evento `loaded` de la escena. |

## 7. Criterios de aceptación

- [x] Existe la tabla `user_settings` en `english_vr` (una fila por usuario, columna
      `login_form_config` de tipo JSON), creada por `ApprendeVr/backend/db/001-user-settings.sql`.
- [x] `GET /api/user-settings/login-form` (autenticado) devuelve `null` para un usuario que nunca
      guardó configuración, y el JSON guardado para uno que sí.
- [x] `PUT /api/user-settings/login-form` (autenticado) guarda la posición/zoom enviados; llamarlo
      de nuevo actualiza la misma fila (no crea una segunda).
- [x] Pedir `GET`/`PUT /api/user-settings/<vista-inexistente>` responde `400` con un mensaje claro,
      en vez de un error genérico o un `500`.
- [x] Sin `Authorization: Bearer` válido, ambos endpoints responden `401` (mismo comportamiento que
      `GET /api/users/me`).
- [x] Con sesión iniciada: mover/hacer zoom al formulario de login con `UbicacionControl`, recargar
      la página y volver a abrir el formulario muestra la posición/zoom ya ajustados (no el
      default `[0, 1.6, 1]` / `2.70`).
- [ ] Sin sesión iniciada, `UbicacionControl` sigue moviendo el formulario en pantalla con
      normalidad (estado local), sin llamadas a la API ni errores en consola. Cubierto por revisión
      de código (guarda `if (!token) return`), no probado todavía en navegador.
- [ ] Dos usuarios distintos que ajustan la posición del formulario en el mismo navegador (sesiones
      separadas) conservan cada uno su propio valor guardado. No probado todavía (solo un usuario).
- [x] `GET`/`PUT /api/user-settings/aframe-view` funcionan igual que `login-form` (guardan/leen
      `{ video, karaoke, newSong }`, `400` en vista inexistente/config inválido, `401` sin token).
- [x] En la vista A-Frame, cada elemento (video, karaoke, agregar canción) tiene su propio marcador
      📍 pegado a él (no uno global): mover con su d-pad y pulsar GUARDAR registra el ajuste en la
      base de datos; mover sin pulsar GUARDAR no persiste nada.
- [x] Con sesión iniciada: mover y GUARDAR el video/karaoke/agregar-canción, recargar la página y
      confirmar que cada uno aparece en la posición guardada (no la hardcodeada de `index.html`).
- [ ] En la vista A-Frame, sin sesión iniciada, los marcadores 📍 siguen moviendo cada elemento en
      pantalla con normalidad (el botón GUARDAR es un no-op silencioso, sin llamadas a la API ni
      errores en consola).

## 8. Referencias

- Requerimiento 007 (formulario 3D de login/registro, `UbicacionControl`, `authPosition`/
  `authDistanceFactor`): `ApprendeVr/Documentation/Requerimientos/1-Pending/007-formulario-3d-login-registro/`.
- Requerimiento 009 (mismo patrón de sesión JWT vía `localStorage['apprendevr_auth']` +
  `GET /api/users/me` reutilizado por paneles de la vista A-Frame):
  `ApprendeVr/Documentation/Requerimientos/2-Developing/009-vista-aframe-evaluacion-canciones/`.
- Skill `backend-nestjs` (arquitectura por dominio, funciones puras testeables, `synchronize: false`).
- `ApprendeVr/backend/src/users/` como referencia directa del patrón controller/service/entity +
  `JwtAuthGuard`/`@CurrentUser()` a replicar en `user-settings`.

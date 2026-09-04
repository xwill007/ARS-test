# Backend NestJS — Documento base de implementación

Documento base que define **cómo** se va a construir el backend de `ApprendeVr`. Es la fuente de
verdad para empezar a codificar en la rama `31-will-backend`; no es un requerimiento puntual sino
el contrato de arquitectura y convenciones que debe cumplir cada módulo que se agregue.

## 1. Objetivo y alcance

Reemplazar el backend PHP/MySQLi del proyecto `A-frame` (clonado en `A-frame/`, carpeta
`Proyecto/backend`) por un backend **NestJS + TypeORM + MySQL** que sirva al frontend de
`ApprendeVr/frontend` (karaoke de canciones, evaluación de vocabulario/frases, y gestión de
usuarios), reutilizando la base de datos `english_vr` importada del proyecto `A-frame`.

**Incluye:**
- Definición de arquitectura por componentes/módulos con principios SOLID.
- Mapeo del esquema de BD español → inglés (con migración de renombrado).
- Contrato REST equivalente a los 8 endpoints PHP existentes.
- Autenticación JWT con compatibilidad con los hashes bcrypt ya existentes.
- Servicio de streaming de video con soporte `Range` para el karaoke.
- Convenciones de proyecto (inglés, locales, tests, `.env`).

**No incluye** (por ahora): deploy a producción, CI/CD, WebSocket, transcodificación de video,
o migración del frontend para consumir estos endpoints (se hará después).

## 2. Decisiones de arquitectura (confirmadas)

| Decisión | Elección | Consecuencia |
|---|---|---|
| Capa de acceso a datos | **TypeORM** | Entidades + repositorios, decoradores `@Entity`, `@Column` con mapeo explícito. |
| Autenticación | **JWT** (`@nestjs/jwt` + `passport-jwt`) | `login` devuelve `access_token`; el frontend lo guardará en `VRUserContext`. |
| Contraseñas existentes | **Mantener bcrypt** | Se reutilizan los hashes `$2y$10$…` de `usuarios.password`; login usa `bcrypt.compare`. |
| Nombres de columnas | **Renombrar a inglés + migración** | Una migración TypeORM convierte el esquema español importado a nombres en inglés. |
| Servir videos | **Backend con soporte `Range`** | Nest expone un endpoint de streaming con `206 Partial Content` para seek de video. |

## 3. Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| Runtime | Node.js (≥ 20) | — |
| Framework | NestJS 10 | CLI estándar (`@nestjs/cli`) |
| ORM | TypeORM | Entidades + migraciones |
| Driver MySQL | `mysql2` | Dependencia de TypeORM para MySQL |
| Auth | `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt` | JWT + verificación bcrypt |
| Validación | `class-validator` + `class-transformer` | DTOs tipados (reemplaza los `isset`/`if` sueltos del PHP) |
| Config | `@nestjs/config` | Variables de entorno con validación |
| Base de datos | MySQL 8.0 (`english_vr`) | Importada de `A-frame/Proyecto/BaseDatos/english_vr.sql` |

## 4. Estructura del proyecto (arquitectura por módulo/dominio — opción 2)

Cada dominio es un **módulo Nest autocontenido** que vive en **una sola carpeta** (`src/<dominio>/`),
reuniendo módulo + controller + service + funciones puras + entidad + DTOs + tests. Esto permite
**relacionar visualmente** todo el código de una entidad (lo de `songs` está en `src/songs/`) y
**reusar** el dominio completo copiando su carpeta y registrando su módulo, sin dependencias ocultas.
Siguiendo SRP y DIP: los services dependen de `Repository<Entity>` inyectados, nunca de `connDB` global.

```
ApprendeVr/backend/
  src/
    main.ts                 # bootstrap: ValidationPipe global, CORS, prefijo /api
    app.module.ts           # agrega ConfigModule, TypeOrmModule y los módulos de dominio
    config/
      configuration.ts      # tipa y valida las variables de entorno (.env)
    database/
      database.module.ts    # TypeOrmModule.forRoot (lee config)
    common/                 # reutilizable entre módulos (guards, decorators, filters, helpers)
      guards/jwt-auth.guard.ts
      decorators/current-user.decorator.ts
      filters/http-exception.filter.ts
    auth/
      auth.module.ts        # JwtModule + Passport
      auth.controller.ts    # POST /auth/login, POST /auth/register
      auth.service.ts       # login (bcrypt.compare), registro (bcrypt.hash)
      auth.util.ts          # funciones puras (validación de credenciales, payload)
      jwt.strategy.ts
      auth.util.spec.ts
    users/
      users.module.ts
      users.controller.ts   # GET /users/me
      users.service.ts
      users.util.ts
      entities/user.entity.ts
      dto/register-user.dto.ts
      users.util.spec.ts
      users.service.spec.ts
    songs/
      songs.module.ts
      songs.controller.ts   # GET /songs, POST /songs, GET /songs/:id/words, GET /songs/:id/phrases
      songs.service.ts
      songs.util.ts
      entities/song.entity.ts
      dto/create-song.dto.ts
      songs.util.spec.ts
      songs.service.spec.ts
    words/
      words.module.ts
      words.service.ts      # lógica de palabras (Nivel 1/2)
      words.util.ts
      entities/word.entity.ts
    phrases/
      phrases.module.ts
      phrases.service.ts    # lógica de frases (Nivel 3)
      phrases.util.ts
      entities/phrase.entity.ts
    evaluations/
      evaluations.module.ts
      evaluations.controller.ts  # GET /evaluations, POST /evaluations
      evaluations.service.ts
      evaluations.util.ts
      entities/evaluation.entity.ts
      dto/save-evaluation.dto.ts
    videos/
      videos.module.ts
      videos.controller.ts  # GET /videos/:fileName  (streaming Range)
      videos.service.ts
  migrations/
    1700000000000-rename-schema-to-english.ts
  test/
  .env.example
  package.json
  tsconfig.json
```

### 4.1 Diagrama de responsabilidades por capa (flujo HTTP)

```
                HTTP Request
                     │
                     ▼
        ┌──────────────────────────┐
        │  Controller (dominio)    │  solo traduce HTTP: parsea, valida DTO, delega, responde
        └──────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │  Service (dominio)       │  orquesta: inyecta repo + dependencias, llama funciones puras
        └──────────────────────────┘
            │                │
            ▼                ▼
   ┌────────────────┐  ┌──────────────────────┐
   │  util.ts       │  │  Repository<Entity>  │
   │  (funciones    │  │  (TypeORM)           │
   │  puras, sin    │  └──────────┬───────────┘
   │  efectos)      │             ▼
   └────────────────┘      ┌─────────────┐
                           │ MySQL       │
                           │ english_vr  │
                           └─────────────┘
```

### 4.2 Reglas de componente y reuso

- Un **módulo por carpeta**, registrado en `AppModule`; no se importa código de otro dominio
  directamente salvo vía su `*.module.ts` (o su `exports`). Esto es lo que hace a cada dominio
  portable/reutilizable.
- Todo lo **compartido** va en `src/common/` (guards, decorators, filters, interceptors, helpers),
  nunca duplicado entre dominios.
- Cada módulo expone una única responsabilidad de dominio (S = SRP).
- Los repositorios se inyectan por interfaz/abstracción de TypeORM, no se instancian (D = DIP).
- Los DTOs definen el contrato de entrada/salida; los services no conocen HTTP (S + OCP).
- No se duplica lógica entre módulos; utilidades compartidas van a `common/` (DRY).
- Nombre de variables/funciones/archivos en **inglés** (regla de `project.rules`).

**Arquitectura por funciones simples testeables (regla obligatoria):**
- Toda la lógica de negocio se construye con **funciones simples y puras**, exportadas y
  unit-testables con Jest (`.spec.ts`), no con métodos largos acoplados a efectos (HTTP/BD).
- **Funciones puras primero:** cálculo, validación, transformación y reglas de negocio se extraen
  a funciones puras (sin efectos secundarios) que viven junto al módulo o en `*.util.ts`, para
  poder testearlas sin mockear la base de datos.
- **Separar efectos de lógica:** los services orquestan (repo, dependencias) pero delegan el "qué"
  a funciones puras; el controller solo traduce HTTP.
- **Una función = una responsabilidad** (SRP), pocas líneas, nombre en inglés.
- **Cada función simple tiene su `.spec.ts`** con casos normales y de borde, colocalizado con su
  fuente (`src/.../foo.util.spec.ts`). Un service que no se pueda testear sin levantar la BD es
  señal de lógica acoplada que debe extraerse.

## 5. Base de datos y migración de esquema

### 5.1 Origen

La base `english_vr` se importa desde `A-frame/Proyecto/BaseDatos/english_vr.sql` (dump completo:
schema + datos). Tablas actuales: `canciones_vr`, `frases_vr`, `palabras_vr`, `evaluaciones_vr`,
`usuarios`. Para arrancar el backend basta con esa base levantada (ver `ApprendeVr/Documentation/database.md`).

### 5.2 Mapeo español → inglés (migración de renombrado)

Decisión: **estandarizar a inglés**. La migración TypeORM
`rename-schema-to-english.ts` renombra tablas y columnas. Mapeo completo:

| Tabla origen (es) | Tabla destino (en) | Columna origen | Columna destino | Tipo |
|---|---|---|---|---|
| `canciones_vr` | `songs` | `id_cancion` | `id` | PK, AI |
| | | `titulo_cancion` | `title` | varchar(255) |
| | | `autor_cancion` | `author` | varchar(255) |
| | | `archivo_cancion` | `file_name` | varchar(255) |
| | | `fecha_hora_cancion` | `created_at` | datetime |
| | | `idioma_cancion` | `language` | varchar(50) |
| `frases_vr` | `phrases` | `id_frase` | `id` | PK, AI |
| | | `canciones_id_frase` | `song_id` | FK → `songs.id` |
| | | `ingles_frase` | `english_text` | text |
| | | `español_frase` | `spanish_text` | text |
| | | `tiempo_frase` | `phrase_time` | time |
| `palabras_vr` | `words` | `id_palabra` | `id` | PK, AI |
| | | `id_frase_palabra` | `phrase_id` | FK → `phrases.id` |
| | | `esp_palabra` | `spanish_word` | text |
| | | `ing_palabra` | `english_word` | text |
| | | `id_cancion_palabra` | `song_id` | FK → `songs.id` |
| `evaluaciones_vr` | `evaluations` | `id_evaluacion` | `id` | PK, AI |
| | | `id_cancion` | `song_id` | FK → `songs.id` |
| | | `id_usuario` | `user_id` | FK → `users.id` |
| | | `total` | `total` | int (se mantiene) |
| | | `nota_evaluacion` | `note` | text |
| | | `terminado` | `finished` | tinyint(1) |
| | | `nivel` | `level` | tinyint(1) (1/2/3) |
| | | `fecha_hora` | `created_at` | datetime |
| `usuarios` | `users` | `id` | `id` | PK, AI |
| | | `name` | `name` | varchar(100) |
| | | `email` | `email` | varchar(100), UNIQUE |
| | | `password` | `password` | varchar(225) (bcrypt) |
| | | `level` | `level` | text |
| | | `date` | `created_at` | datetime |

Las claves foráneas **no** están declaradas en el SQL original (solo PK y UNIQUE). La migración
puede agregarlas como `FOREIGN KEY` reales (recomendado) para integridad referencial, o dejarlas
lógicas si se prefiere no tocar datos. Decisión: **agregar FKs reales** (MySQL lo permite con la
data actual porque los ids ya son consistentes).

### 5.3 Flujo de migración (orden de trabajo)

1. Levantar MySQL con `english_vr` importado desde `english_vr.sql` (esquema español).
2. Configurar TypeORM con `synchronize: false` (nunca en producción).
3. Escribir y ejecutar la migración de renombrado (`migration:run`).
4. A partir de ahí, **solo** TypeORM gestiona el esquema (nuevas migraciones con
   `typeorm migration:generate`).

### 5.4 Datos a limpiar (hallazgos del dump)

- `usuarios.level` mezcla valores: `'0'`, `'Beginner'`, `'Intermediate'`, `'Advanced'`. Conviene
  normalizar a un enum (`beginner | intermediate | advanced`) en la migración o dejarlo como texto.
- `evaluaciones_vr.nota_evaluacion` guarda texto suelto (p. ej. `'quedate'`, `'a mí'`), no una
  calificación estructurada — es la palabra/frase fallada. Se mantiene como `note` (text).
- `canciones_vr.archivo_cancion` referencia `StandByMe_BenEKing.mp4`, etc.; los videos viven en
  `A-frame/english-vr/VR/videos/` (carpetas `karaoke` y `tutoriales`). El backend debe recibir la
  ruta del directorio de videos vía `.env` (ver sección 8).

## 6. Contrato REST (equivalente a los endpoints PHP)

| Endpoint PHP (`A-frame/Proyecto/backend`) | Ruta Nest | Método | Entrada | Salida |
|---|---|---|---|---|
| `usuarios/login_usuario.php` | `/auth/login` | POST | `{email, password}` | `{access_token, user}` |
| `usuarios/registrar_usuario.php` | `/auth/register` | POST | `{name, email, password, level}` | `{user}` (201) |
| `usuarios/current_user.php` | `/users/me` | GET | JWT | `{user}` |
| `canciones/registrar_canciones.php` (listar) | `/songs` | GET | — | `{songs: []}` |
| `canciones/registrar_canciones.php` (alta/upsert) | `/songs` | POST | `{title, author, file_name, language?}` | `{songs: []}` |
| `palabras/obtener_palabras.php` | `/songs/:id/words` | GET | `:id` | `{words: []}` |
| `frases/obtener_frases.php` | `/songs/:id/phrases` | GET | `:id` | `{phrases: []}` |
| `evaluaciones/guardar_evaluacion.php` | `/evaluations` | POST | `{song_id, total, note?, finished?, level?}` | `{id_evaluacion}` |
| `evaluaciones/obtener_evaluaciones.php` | `/evaluations` | GET | `?userId=&songId=` | `{evaluations: []}` |
| *(nuevo)* streaming de video | `/videos/:fileName` | GET | `Range` header | `206 Partial Content` |

**Notas de contrato:**
- El PHP aceptaba `songTitle+author` **o** `archivo`; en Nest se normaliza a **id de canción**
  (`/songs/:id/...`). El frontend primero resuelve la canción por título/autor/archivo vía
  `GET /songs` y luego llama a words/phrases por `id` (más limpio y REST).
- Las respuestas de error son `{statusCode, message, error}` (formato estándar de Nest), no el
  `{status, message}` del PHP.
- `registrar_usuario.php` hacía redirect con la contraseña en la URL (inseguro); en Nest se elimina
  esa práctica: `register` devuelve JSON y nunca reenvía la contraseña.

## 7. Autenticación (JWT + bcrypt)

- **Login** (`AuthService.login`): busca usuario por `email`, verifica con `bcrypt.compare(password, user.password)`.
  Los hashes existentes son `$2y$10$…` (bcrypt de PHP) — **compatibles** con `bcrypt` de Node.
  Si valida, firma un JWT (`sub` = `user.id`) y devuelve `access_token` + `user` (sin `password`).
- **Registro**: `bcrypt.hash(password, 10)` (mismo costo que PHP).
- **Guard** `JwtAuthGuard` protege `/users/me` (y futuros endpoints autenticados). El `user` se
  obtiene con el decorador `@CurrentUser()` (id extraído del JWT, luego consulta a `users`).
- **Sesión**: se elimina `$_SESSION` del PHP; el estado vive en el token del lado del frontend
  (futuro `VRUserContext`).

## 8. Streaming de video (karaoke con soporte `Range`)

`VideosService` expone un método `stream(fileName, rangeHeader)`:

- Ruta base de videos por `.env` (`VIDEOS_DIR`), por defecto apuntando a la copia local de
  `A-frame/english-vr/VR/videos/`.
- Validar `fileName` contra `basename` (evitar path traversal).
- Leer el `Range` header; si está presente, responder `206 Partial Content` con
  `Content-Range: bytes start-end/size`, `Accept-Ranges: bytes`, `Content-Type: video/mp4`.
- Si no hay `Range`, responder `200` con el archivo completo (para reproducir de corrido).
- Usar `fs.createReadStream(path, { start, end })` para no cargar el video en memoria.

Esto habilita el seek del reproductor de karaoke (el frontend A-Frame/React podrá hacer
`video.src = /api/videos/StandByMe_BenEKing.mp4` con seeking por range).

## 9. Configuración y variables de entorno

`.env` (nunca commiteado; sí se commitea `.env.example`):

```
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=english_vr
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
VIDEOS_DIR=/Users/xwill007/Documents/GITHUB/ARS-test/A-frame/english-vr/VR/videos
```

- `PORT`: el backend corre en `3001` (el frontend Vite usa `3000`).
- CORS: habilitar solo para el origin de Vite (`VITE_FRONT_IP:VITE_PORT`, mismas variables que usa
  `scripts/start-mobile.sh`), o usar el proxy de Vite hacia Nest en desarrollo.
- Credenciales: reutilizar el patrón del `connDB.php` original (env con fallback local), pero con
  validación de `@nestjs/config` en `config/configuration.ts`.

## 10. Convenciones de proyecto

- **Idioma del código**: variables/funciones/archivos en inglés (`project.rules`).
- **Textos de UI**: no aplican al backend, pero cualquier mensaje de error legible por el usuario
  final debe ser un código estable (ej. `EMAIL_ALREADY_EXISTS`), no un string suelto; el frontend
  lo traduce con `locales`.
- **Secretos**: nunca en código; solo `.env` (`.gitignore` actualizado).
- **Tests**: unit tests por service (lógica pura) con Jest; e2e tests por módulo cuando se defina
  una base de test.
- **Commits**: en inglés, con conventional commits (ver skill `confirmar-antes-de-commit`).
- **Ramas**: la de este trabajo es `31-will-backend` (ver skill `crear-rama-git`).

## 11. Plan de implementación (fases)

1. **Scaffold** — `nest new backend` dentro de `ApprendeVr/`, agregar TypeORM + config + `.env`.
2. **Migración de esquema** — importar `english_vr.sql`, escribir y correr la migración de
   renombrado español→inglés.
3. **AuthModule + UsersModule** — login (bcrypt), register, `GET /users/me` (JWT). Primero, porque
   songs/evaluations dependen del usuario identificado.
4. **SongsModule** — `GET /songs`, `POST /songs` (alta/upsert), entidad `Song`.
5. **WordsModule + PhrasesModule** — `GET /songs/:id/words` y `/phrases` (Nivel 1/2/3).
6. **EvaluationsModule** — `GET /evaluations`, `POST /evaluations` (guardar `level` 1/2/3).
7. **VideosModule** — streaming con `Range`.
8. **Tests** — unit tests por service + e2e de login y songs.

## 12. Próximos pasos

- Confirmar ubicación final del backend (`ApprendeVr/backend/`) y el puerto (`3001`).
- Confirmar si se renombran también los **nombres de tabla** (además de columnas) — este documento
  asume que sí (`canciones_vr`→`songs`, etc.).
- Definir el enum de `users.level` (normalizar `'0'` y `'Beginner/Intermediate/Advanced'`).
- Levantar la base `english_vr` en el entorno local antes de la Fase 2.

## 13. Referencias

- Esquema y datos: `A-frame/Proyecto/BaseDatos/english_vr.sql`.
- Endpoints PHP originales: `A-frame/Proyecto/backend/modelos/**/*.php`.
- Documentación previa: `ApprendeVr/Documentation/database.md`,
  `ApprendeVr/Documentation/integracion-aframe.md` (sección 7, NestJS).
- Reglas de proyecto: `ApprendeVr/Documentation/project.rules`.

# Requerimiento 004 — Backend NestJS: arquitectura base + CRUD sobre la BD de A-frame

## 1. Objetivo

Construir la base del backend de `ApprendeVr` en **NestJS + TypeORM + MySQL**, con una
**arquitectura API por componentes** (módulos autocontenidos) que exponga **CRUD sobre los datos
actuales** de la base `english_vr` importada del proyecto `A-frame` (canciones, frases, palabras,
evaluaciones y usuarios). La base de datos corre en un **contenedor Docker** (mismo patrón que
`A-frame/docker-dev`), levantada desde un `docker-compose.yml` propio del backend.

Este requerimiento entrega la **estructura base funcional** (scaffold + conexión + entidades +
módulos CRUD + auth JWT + Docker), no la lógica de negocio avanzada de karaoke/evaluación (eso se
construye encima en requerimientos posteriores).

## 2. Antecedentes y estado actual

- **Estado:** el backend no existe todavía. Solo se generó el scaffold de Nest CLI
  (`ApprendeVr/backend/` con `app.module.ts`, `app.controller.ts`, `app.service.ts`, `main.ts`)
  **sin dependencias instaladas**: `npm install` de las librerías falló por conflicto de versiones.
- **Documento base:** `ApprendeVr/Documentation/backend-nestjs.md` (redactado en la rama
  `31-will-backend`) define las decisiones de arquitectura confirmadas: TypeORM, JWT, bcrypt,
  renombrar columnas a inglés con migración, y streaming de video con `Range`.
- **Base de datos:** `english_vr` (MySQL 8.0) provista por `A-frame/Proyecto/BaseDatos/english_vr.sql`
  (submodule `A-frame/`). Tablas: `canciones_vr`, `frases_vr`, `palabras_vr`, `evaluaciones_vr`,
  `usuarios`. El patrón Docker de referencia está en `A-frame/docker-dev/docker-compose.yml`
  (imagen `mysql:8.0`, import automático del `.sql` vía `/docker-entrypoint-initdb.d/`).
- **Bloqueo conocido (a resolver en la Fase 1):** `npm install` falló con `ERESOLVE` porque
  `@nestjs/config@12` exige `@nestjs/common@^11 || ^12`, pero el scaffold usa
  `@nestjs/common@^10`. Se debe fijar `@nestjs/config@3` (compatible con Nest 10) o usar
  `--legacy-peer-deps`.
- **Coordinación con el requerimiento 007:** la Fase 6 (Auth JWT+bcrypt) descrita en este
  documento y en `checklist.md` se **ejecuta desde**
  `Documentation/Requerimientos/1-Pending/007-formulario-3d-login-registro/` (formulario 3D de
  login/registro), en vez de desde aquí, para no bloquear ese trabajo esperando el resto del
  scaffold. El resto del alcance de este requerimiento (scaffold, Docker, TypeORM, entidades, CRUD
  de `songs/words/phrases/evaluations`, streaming de video) no cambia.

## 3. Alcance

### Incluido

- Scaffold NestJS funcional en `ApprendeVr/backend/` con dependencias instaladas y que compila.
- `docker-compose.yml` + `Dockerfile` + `.env.example` para levantar MySQL con `english_vr`
  importado desde el submodule `A-frame`.
- Conexión TypeORM (`TypeOrmModule.forRoot`) leyendo configuración de `@nestjs/config`.
- Entidades mapeadas al esquema **actual en español** (sin renombrar todavía — la migración de
  renombrado a inglés se difiere a un requerimiento posterior para no bloquear el CRUD base).
- Módulos CRUD por dominio con controller + service + dto:
  - `users` (users CRUD)
  - `songs` (canciones CRUD)
  - `words` (palabras)
  - `phrases` (frases)
  - `evaluations` (evaluaciones)
- ~~`auth` module: login/register con JWT y verificación bcrypt compatible con los hashes
  existentes.~~ → **movido al requerimiento 007** (ver nota en "Antecedentes y estado actual").
- Guard JWT y decorador `@CurrentUser()`.
- `ValidationPipe` global y DTOs con `class-validator`.
- Prefijo `/api` y CORS para el origin de Vite en desarrollo.
- Endpoint de streaming de video con soporte `Range` (`/api/videos/:fileName`).

### No incluido

- Migración de renombrado español→inglés de tablas/columnas (se difiere; se documenta la decisión).
- Lógica de negocio de karaoke/evaluación (puntajes, niveles, pronunciación).
- Normalización del enum `users.level`.
- Tests e2e completos (solo unit tests básicos del scaffold y de auth).
- Deploy/CI/CD, WebSocket, transcodificación.

## 4. Diseño técnico

### 4.1 Capa de datos

TypeORM con `synchronize: false` (nunca en producción). Las entidades usan `@Entity({ name: ... })`
y `@Column({ name: ... })` para mapear **los nombres en español actuales** sin alterar la BD:

| Entidad (TS) | Tabla BD | Columnas mapeadas |
|---|---|---|
| `User` | `usuarios` | `id`, `name`, `email`, `password`, `level`, `date` |
| `Song` | `canciones_vr` | `id_cancion`, `titulo_cancion`, `autor_cancion`, `archivo_cancion`, `fecha_hora_cancion`, `idioma_cancion` |
| `Phrase` | `frases_vr` | `id_frase`, `canciones_id_frase`, `ingles_frase`, `español_frase`, `tiempo_frase` |
| `Word` | `palabras_vr` | `id_palabra`, `id_frase_palabra`, `esp_palabra`, `ing_palabra`, `id_cancion_palabra` |
| `Evaluation` | `evaluaciones_vr` | `id_evaluacion`, `id_cancion`, `id_usuario`, `total`, `nota_evaluacion`, `terminado`, `nivel`, `fecha_hora` |

### 4.2 Convención de módulos (opción 2: módulo/dominio)

Cada dominio es un **módulo autocontenido en una sola carpeta** (`src/<dominio>/`): `*.module.ts`,
`*.controller.ts`, `*.service.ts`, `*.util.ts`, `entities/`, `dto/`, `*.spec.ts`. Todo el código de
una entidad queda junto para relacionarlo visualmente y poder **reusar** el dominio copiando su
carpeta y registrando su módulo. Los services inyectan `Repository<Entity>` (DIP), no una conexión
global. Lo compartido va en `src/common/` (guards, decorators, filters).

```
src/<dominio>/
  <dominio>.module.ts
  <dominio>.controller.ts   # traduce HTTP
  <dominio>.service.ts      # orquesta repo + funciones puras
  <dominio>.util.ts         # funciones puras de negocio
  entities/<entidad>.entity.ts
  dto/*.dto.ts
  <dominio>.util.spec.ts
  <dominio>.service.spec.ts
```

### 4.3 Funciones simples testeables (spec)

**Regla de arquitectura obligatoria:** toda la lógica de negocio se construye con **funciones
simples y puras**, exportadas y unit-testables con Jest (`.spec.ts`), en vez de métodos largos o
acoplados a efectos (HTTP/BD). Esto aplica a cálculo, validación, transformación y reglas de
negocio.

- **Funciones puras primero:** extraer la lógica a funciones puras (sin efectos secundarios:
  reciben inputs, devuelven outputs) que viven junto al módulo o en un archivo de utilidades
  (`*.util.ts`), para poder testearlas sin mockear la base de datos.
- **Separar efectos de lógica:** los services orquestan (llaman al repo, inyectan dependencias)
  pero delegan el "qué" a funciones puras. El controller solo traduce HTTP.
- **Una función = una responsabilidad** (SRP), de pocas líneas, con nombre en inglés.
- **Cada función simple tiene su `.spec.ts`** que cubre casos normales y de borde. Un service que
  no se pueda testear sin levantar la BD es señal de que hay lógica acoplada que debe extraerse.
- Los tests viven colocalizados con su fuente (`src/.../foo.util.spec.ts`, `.../auth.service.spec.ts`).

### 4.4 Auth (movido al requerimiento 007)

> Esta subsección queda como referencia de diseño histórica; su implementación se ejecuta desde
> `1-Pending/007-formulario-3d-login-registro/` (ver "Antecedentes y estado actual").

`POST /api/auth/login` → `bcrypt.compare(password, user.password)` (compatible con `$2y$10$…`),
firma JWT y devuelve `{access_token, user}`. `POST /api/auth/register` → `bcrypt.hash`.
`GET /api/users/me` protegido con `JwtAuthGuard`.

### 4.5 Docker

`docker-compose.yml` en `ApprendeVr/backend/` con un único servicio `db` (imagen `mysql:8.0`),
montando `../../A-frame/Proyecto/BaseDatos/english_vr.sql` como script de init. El backend corre
en el host (no en contenedor) en esta fase; el contenedor solo provee MySQL.

## 5. Archivos a modificar / crear

| Archivo | Acción |
|---|---|
| `ApprendeVr/backend/package.json` | Fijar dependencias compatibles (Nest 10, `@nestjs/config@3`). |
| `ApprendeVr/backend/src/main.ts` | `ValidationPipe` global, prefijo `/api`, CORS. |
| `ApprendeVr/backend/src/app.module.ts` | `ConfigModule`, `TypeOrmModule.forRoot`, módulos de dominio. |
| `ApprendeVr/backend/src/config/configuration.ts` | Tipar/validar variables de entorno. |
| `ApprendeVr/backend/src/database/database.module.ts` | `TypeOrmModule.forRootAsync`. |
| `ApprendeVr/backend/src/auth/*` | ~~`auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `jwt.strategy.ts`.~~ → movido al requerimiento 007. |
| `ApprendeVr/backend/src/users/*` | `users.module.ts`, `users.controller.ts`, `users.service.ts`, `entities/user.entity.ts`, `dto/*`. |
| `ApprendeVr/backend/src/songs/*` | módulo CRUD + `entities/song.entity.ts` + dto. |
| `ApprendeVr/backend/src/words/*` | módulo + `entities/word.entity.ts`. |
| `ApprendeVr/backend/src/phrases/*` | módulo + `entities/phrase.entity.ts`. |
| `ApprendeVr/backend/src/evaluations/*` | módulo CRUD + `entities/evaluation.entity.ts` + dto. |
| `ApprendeVr/backend/src/videos/*` | `videos.controller.ts` + `videos.service.ts` (streaming Range). |
| `ApprendeVr/backend/docker-compose.yml` | Servicio MySQL con import de `english_vr.sql`. |
| `ApprendeVr/backend/Dockerfile` | (opcional) imagen del backend para una fase posterior. |
| `ApprendeVr/backend/.env.example` | Variables documentadas (sin secretos reales). |
| `ApprendeVr/Documentation/backend-nestjs.md` | Actualizar con la decisión de no renombrar en esta fase. |

## 6. Criterios de aceptación

- [ ] `npm run build` (o `nest build`) compila sin errores en `ApprendeVr/backend/`.
- [ ] `docker compose up -d` en `ApprendeVr/backend/` levanta MySQL con `english_vr` importado
      (tablas `canciones_vr`, `frases_vr`, `palabras_vr`, `evaluaciones_vr`, `usuarios` con datos).
- [ ] El backend arranca (`npm run start:dev`) y se conecta a MySQL sin error.
- [ ] `GET /api/songs` devuelve las 3 canciones del dump.
- [ ] `GET /api/songs/:id/words` y `GET /api/songs/:id/phrases` devuelven palabras/frases de una
      canción existente.
- [ ] ~~`POST /api/auth/login` con credenciales de un usuario del dump (`usuarios`) devuelve un
      `access_token` válido.~~ → criterio movido a `007-formulario-3d-login-registro`.
- [ ] ~~`GET /api/users/me` con ese token devuelve el usuario (sin `password`).~~ → criterio movido
      a `007-formulario-3d-login-registro`.
- [ ] `POST /api/evaluations` guarda una evaluación y `GET /api/evaluations` la lista.
- [ ] `GET /api/videos/:fileName` con header `Range` responde `206 Partial Content`.
- [ ] No hay secretos hardcodeados; las credenciales salen de `.env`.
- [ ] La lógica de negocio está en funciones simples/puras con su `.spec.ts` (unit test Jest),
      y `npm test` pasa sin necesidad de levantar la base de datos.

## 8. Referencias

- Documento base: `ApprendeVr/Documentation/backend-nestjs.md`.
- Esquema/datos: `A-frame/Proyecto/BaseDatos/english_vr.sql` (submodule).
- Docker de referencia: `A-frame/docker-dev/docker-compose.yml`.
- Endpoints PHP originales: `A-frame/Proyecto/backend/modelos/**/*.php`.
- Reglas de proyecto: `ApprendeVr/Documentation/project.rules`.
- Convención de ramas: skill `.agents/skills/crear-rama-git/SKILL.md` (rama `31-will-backend`).

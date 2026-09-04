# Checklist de ejecución (paso a paso)

### Fase 1 — Dependencias y compilación base

- [ ] 1.1 Fijar `@nestjs/config@3` (compatible con Nest 10) en `package.json` y resolver el
      conflicto `ERESOLVE` (o instalar con `--legacy-peer-deps`).
- [ ] 1.2 `npm install` de: `@nestjs/typeorm typeorm mysql2 @nestjs/config @nestjs/jwt
      @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer`.
- [ ] 1.3 Instalar tipados: `@types/passport-jwt @types/bcrypt @types/multer`.
- [ ] 1.4 Verificar que `npm run build` compila el scaffold limpio.

### Fase 2 — Docker + base de datos

- [ ] 2.1 Crear `docker-compose.yml` con servicio `db` (`mysql:8.0`), env
      `MYSQL_ALLOW_EMPTY_PASSWORD=yes`, `MYSQL_DATABASE=english_vr`, puerto `3306`.
- [ ] 2.2 Montar `../../A-frame/Proyecto/BaseDatos/english_vr.sql` en
      `/docker-entrypoint-initdb.d/01-english_vr.sql`.
- [ ] 2.3 Crear `.env.example` con `DB_HOST=localhost`, `DB_PORT=3306`, `DB_USER=root`,
      `DB_PASS=`, `DB_NAME=english_vr`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `VIDEOS_DIR`, `PORT=3001`.
- [ ] 2.4 `docker compose up -d` y verificar con `docker compose logs -f db` que importa y queda
      `ready for connections`.
- [ ] 2.5 (opcional) `Dockerfile` para el backend, para una fase futura.

### Fase 3 — Configuración y conexión TypeORM

- [ ] 3.1 Crear `src/config/configuration.ts` que lea y tipa las variables de entorno.
- [ ] 3.2 Crear `src/database/database.module.ts` con `TypeOrmModule.forRootAsync`
      (`type: 'mysql'`, `synchronize: false`, `autoLoadEntities: true`).
- [ ] 3.3 Registrar `ConfigModule.forRoot({ isGlobal: true, load: [configuration] })` y
      `DatabaseModule` en `app.module.ts`.
- [ ] 3.4 Configurar `main.ts`: `ValidationPipe({ whitelist: true, transform: true })`,
      prefijo global `/api`, `enableCors` para el origin de Vite.

### Fase 4 — Entidades

- [ ] 4.1 `src/users/entities/user.entity.ts` → tabla `usuarios`.
- [ ] 4.2 `src/songs/entities/song.entity.ts` → tabla `canciones_vr`.
- [ ] 4.3 `src/phrases/entities/phrase.entity.ts` → tabla `frases_vr`.
- [ ] 4.4 `src/words/entities/word.entity.ts` → tabla `palabras_vr`.
- [ ] 4.5 `src/evaluations/entities/evaluation.entity.ts` → tabla `evaluaciones_vr`.
- [ ] 4.6 Declarar relaciones con `@ManyToOne`/`@OneToMany` + `@JoinColumn` según corresponda.

### Fase 5 — Módulos CRUD

- [ ] 5.1 `SongsModule`: `GET /songs`, `GET /songs/:id`, `POST /songs`, `PATCH /songs/:id`,
      `DELETE /songs/:id`.
- [ ] 5.2 `UsersModule`: CRUD básico (leer/listar; crear queda en auth).
- [ ] 5.3 `WordsModule`: `GET /songs/:id/words` (consulta por `id_cancion_palabra`).
- [ ] 5.4 `PhrasesModule`: `GET /songs/:id/phrases` (consulta por `canciones_id_frase`).
- [ ] 5.5 `EvaluationsModule`: `GET /evaluations` (filtros `userId`, `songId`), `POST /evaluations`,
      `GET /evaluations/:id`, `DELETE /evaluations/:id`.
- [ ] 5.6 Cada módulo usa DTOs con `class-validator` (`@IsInt`, `@IsString`, `@IsEmail`, etc.).
- [ ] 5.7 Extraer la lógica de negocio a funciones puras (`*.util.ts`) testeables sin BD, en vez
      de dejarla acoplada dentro de los métodos de los services.
- [ ] 5.8 Escribir `.spec.ts` para cada función pura y cada service (casos normales y de borde).

### Fase 6 — Auth (JWT + bcrypt)

- [ ] 6.1 `AuthModule` con `JwtModule.registerAsync` (secret/expiración desde config).
- [ ] 6.2 `AuthService.login(email, password)` → `bcrypt.compare` contra `users.password`.
- [ ] 6.3 `AuthService.register(dto)` → `bcrypt.hash(password, 10)`.
- [ ] 6.4 `JwtStrategy` (passport-jwt) que valida el token y carga el usuario.
- [ ] 6.5 `JwtAuthGuard` + decorador `@CurrentUser()`.
- [ ] 6.6 `GET /users/me` protegido, devolviendo el usuario sin `password` (usar
      `class-transformer` `@Exclude` en la entidad).

### Fase 7 — Videos (streaming Range)

- [ ] 7.1 `VideosModule` con `VideosController` y `VideosService`.
- [ ] 7.2 `GET /videos/:fileName` valida `basename(fileName)` (anti path traversal).
- [ ] 7.3 Implementar respuesta `206 Partial Content` con `fs.createReadStream({ start, end })`.
- [ ] 7.4 Configurar `VIDEOS_DIR` apuntando a `A-frame/english-vr/VR/videos`.

### Fase 8 — Verificación y cierre

- [ ] 8.1 `npm run build` compila sin errores.
- [ ] 8.2 `npm test` (unit tests Jest) pasa sin necesidad de levantar la base de datos.
- [ ] 8.3 Levantar BD + backend y probar cada criterio de la sección 6 con `curl`/Postman.
- [ ] 8.4 Confirmar que `GET /api/songs` devuelve las 3 canciones y que login/me funcionan.
- [ ] 8.5 Marcar criterios de aceptación como cumplidos.
- [ ] 8.6 Actualizar `ApprendeVr/Documentation/backend-nestjs.md` con lo realmente implementado.

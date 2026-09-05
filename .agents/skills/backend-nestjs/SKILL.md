---
name: backend-nestjs
description: Define la arquitectura del backend NestJS de ApprendeVr (módulos por componente, SOLID, TypeORM, funciones simples testeables con spec). Usar SIEMPRE que se cree o modifique código del backend en ApprendeVr/backend.
---

# Arquitectura del backend NestJS de ApprendeVr

Backend en `ApprendeVr/backend/`: NestJS + TypeORM + MySQL (`english_vr` importado de `A-frame`).
Documento base: `ApprendeVr/Documentation/backend-nestjs.md`. Requerimiento de referencia:
`Documentation/Requerimientos/2-Developing/004-backend-nestjs-arquitectura-crud.md`.

## Estructura por módulo/dominio (opción 2)

Cada dominio vive en **una sola carpeta** (`src/<dominio>/`), que reúne todo lo relacionado con esa
entidad: módulo, controlador, servicio, funciones puras, entidad, DTOs y tests. Esto permite:

- **Relacionar visualmente** el código de una entidad (todo lo de `songs` está en `src/songs/`).
- **Reusar** el dominio completo copiando su carpeta y registrando su módulo, sin arrastrar
  dependencias ocultas.

```
src/
  app.module.ts
  main.ts
  config/                       # configuración de entorno (configuration.ts)
  database/                     # conexión TypeORM (database.module.ts)
  common/                       # reutilizable entre módulos (guards, decorators, filters, helpers)
    guards/
    decorators/
    filters/
    interceptors/
  users/                        # ← un dominio = una carpeta
    users.module.ts
    users.controller.ts         # solo traduce HTTP → llama al service
    users.service.ts            # orquesta repo + funciones puras
    users.util.ts               # funciones puras de negocio (si hay lógica)
    entities/user.entity.ts
    dto/create-user.dto.ts
    dto/update-user.dto.ts
    users.util.spec.ts          # tests de funciones puras
    users.service.spec.ts       # tests del service (repo mockeado)
  songs/
    songs.module.ts
    songs.controller.ts
    songs.service.ts
    songs.util.ts
    entities/song.entity.ts
    dto/...
    songs.util.spec.ts
    songs.service.spec.ts
  words/                        # mismo patrón
  phrases/                      # mismo patrón
  evaluations/                  # mismo patrón
  auth/                         # mismo patrón (login/register/jwt)
  videos/                       # streaming con Range
```

### Diagrama de responsabilidades por capa (flujo HTTP)

```
HTTP Request
    │
    ▼
Controller (solo traduce HTTP: parsea, valida DTO, delega, responde)
    │
    ▼
Service (orquesta: inyecta repo + dependencias, llama funciones puras)
    │
    ├──► util.ts  (funciones puras de negocio — lógica, sin efectos)
    │
    ▼
Repository<Entity> (TypeORM) ──► MySQL (english_vr)
```

Reglas que garantizan el reuso:

- Un **módulo por carpeta**, registrado en `AppModule`; no se importa código de otro dominio
  directamente salvo vía su `*.module.ts` (o su `exports`).
- Todo lo **compartido** va en `src/common/`, nunca duplicado entre dominios.
- **S (SRP):** un módulo = un dominio. `users`, `songs`, `words`, `phrases`, `evaluations`, `videos`, `auth`.
- **D (DIP):** los services inyectan `Repository<Entity>` (`@InjectRepository(...)`), nunca una conexión global.
- Nombres de variables/funciones/archivos en **inglés** (`project.rules`).

## Regla central: funciones simples testeables con `.spec.ts`

**Toda la lógica de negocio se construye con funciones simples y puras, exportadas y
unit-testables con Jest**, no con métodos largos acoplados a efectos (HTTP/BD).

1. **Funciones puras primero.** Cálculo, validación, transformación y reglas de negocio se extraen
   a funciones puras (sin efectos secundarios: reciben inputs, devuelven outputs) en
   `<dominio>.util.ts`, para testearlas sin mockear la base de datos.
2. **Separar efectos de lógica.** El service orquesta (repo, dependencias) pero delega el "qué" a
   funciones puras. El controller solo traduce HTTP.
3. **Una función = una responsabilidad** (SRP), pocas líneas, nombre en inglés, verbo descriptivo.
4. **Cada función simple tiene su `.spec.ts`** colocalizado, cubriendo casos normales y de borde.

Ejemplo de forma correcta:

```ts
// songs.util.ts — lógica pura, testeable sin BD
export function normalizeSongTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ');
}

export function isValidSongPayload(dto: CreateSongDto): boolean {
  return !!dto.title && !!dto.fileName;
}
```

```ts
// songs.util.spec.ts
import { normalizeSongTitle, isValidSongPayload } from './songs.util';

describe('songs.util', () => {
  it('normaliza espacios en el título', () => {
    expect(normalizeSongTitle('  Stand   By Me  ')).toBe('Stand By Me');
  });
});
```

## Reglas de implementación

- **Controllers finos:** reciben DTO validado por el `ValidationPipe` global, llaman al service y
  devuelven el resultado. Sin lógica de negocio.
- **Services delgados:** inyectan repo, delegan la lógica a funciones puras, no acumulan `if`/`else`
  largos.
- **DTOs** con `class-validator` (`@IsString`, `@IsInt`, `@IsEmail`, `@IsOptional`, ...).
- **Sin secretos en código:** credenciales y `JWT_SECRET` vía `@nestjs/config` + `.env`.
- **Sin sincronización automática del esquema:** `synchronize: false`; los cambios van con
  migraciones TypeORM.

## Cómo agregar un módulo o endpoint nuevo

1. Crear la carpeta del dominio con `*.module.ts` y registrarla en `AppModule`.
2. Escribir la **lógica pura primero** en `<dominio>.util.ts` + su `.spec.ts`.
3. Crear el `service` que inyecta el repo y llama a las funciones puras.
4. Crear el `controller` con las rutas y el DTO validado.
5. Escribir unit tests del service (mockeando el repo) y de las funciones puras (sin mocks).
6. Verificar: `npm run build` compila y `npm test` pasa sin levantar MySQL.

## Verificación

- `npm run build` — compila (desde `ApprendeVr/backend/`).
- `npm test` — unit tests (Jest). Deben pasar sin base de datos levantada.
- Si un test necesita levantar MySQL, es señal de que falta extraer lógica a una función pura.
- `npm run test:cov` — cobertura. El `package.json` define `coverageThreshold.global` en 80%
  (statements/branches/functions/lines); Jest falla si algún módulo nuevo la baja del 80%. Antes
  de dar por cerrado un módulo nuevo (o una tanda grande de cambios en `auth`/`users`/etc.),
  correr `npm run test:cov` y revisar la tabla por archivo, no solo el resumen global.
- **Qué NO cuenta para la cobertura** (excluido en `collectCoverageFrom`, porque es wiring
  declarativo sin lógica propia que valga la pena unit-testear): `main.ts` (bootstrap),
  `*.module.ts` (DI), `*.guard.ts` (subclases de una línea de `AuthGuard`), `*.decorator.ts`
  (`createParamDecorator` trivial). Si un archivo de estos categorías empieza a tener lógica real
  (un guard con una condición propia, por ejemplo), sacarlo de la exclusión y testearlo.
- **Qué SÍ hay que testear directamente** (no alcanza con que otro test lo mockee): DTOs
  (`class-validator` + `validate()` de `class-transformer`/`class-validator`, casos válidos e
  inválidos por campo), `*.strategy.ts` (instanciar con dependencias mockeadas y llamar
  `validate()`), `configuration.ts` (defaults vs. variables de entorno presentes), controllers
  (aunque sean delgados: verificar que delegan al service con los argumentos correctos) y todo
  service (mockeando el repo/las dependencias inyectadas, nunca el repo real).

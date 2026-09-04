# Requerimiento 005 — Sistema de Roles, Perfiles y Planes de Pago (RBAC granular)

## 1. Objetivo

Implementar un **sistema de autorización granular** en `ApprendeVr` que permita restringir el
acceso a **módulos, vistas, componentes y elementos** mediante:

- **Roles** — colecciones base de permisos.
- **Perfiles** — extienden uno o varios roles y añaden ajustes finos (grant/deny por elemento).
- **Planes de pago** — otorgan acceso a módulos/vistas y definen precios, actuando como **techo**
  de lo que un perfil puede conceder.

Todo se administra desde **vistas y tablas de configuración** (sin tocar código), y la restricción
se aplica en **frontend y backend** (el backend es la fuente de verdad).

## 2. Antecedentes y estado actual

- El backend NestJS (`ApprendeVr/backend/`) está en definición (requerimiento `004`) con
  arquitectura por módulos y funciones simples testeables.
- La base `english_vr` (`usuarios`, `canciones_vr`, etc.) no tiene ningún mecanismo de
  autorización: el PHP actual solo distingue login/registro.
- Existe el documento base `ApprendeVr/Documentation/roles-perfiles-planes.md` (creado en esta
  misma iteración) que define el modelo de datos, la resolución de permisos y las vistas de
  configuración. Este requerimiento es su **carta de implementación**.
- **Referencia previa probada:** otros proyectos desarrollados implementaron en producción dos
  sistemas análogos — roles/permisos unificados y gestión de planes de pago. Se adoptan sus
  patrones: jerarquía de roles (`hierarchyLevel`), `isSystem`, fallback a rol de sistema,
  sub-recursos `parent:child`, modelo de módulos (`isFixed`/`maxModules`/`selectedModules`),
  enforcement por módulo contratado y permisos efectivos en `/auth/me` como única fuente del
  frontend.
- Decisiones confirmadas con el usuario:
  - **Perfil extiende varios roles** (herencia múltiple).
  - **Plan = acceso a módulos/vistas + perfil base**: un perfil admin de un plan puede crear más
    roles/perfiles que limitan el CRUD, pero a su vez están **limitados por el plan**.
  - **Frontend + Backend** (defensa en profundidad).
  - **1 plan activo + historial de cambios** por usuario; según el plan, el usuario puede crear
    sub-usuarios con roles/perfiles (ej. perfiles "niño" para restringir canciones/niveles).

## 3. Alcance

### Incluido

- Tablas nuevas (migración TypeORM): `roles`, `permissions`, `role_permissions`, `profiles`,
  `profile_roles`, `profile_permissions`, `modules`, `module_features`, `plans`, `plan_prices`,
  `plan_modules`, `subscriptions`, `subscription_changes`, `payments`, y columnas
  `users.profile_id` + `users.role_id` (fallback).
- Catálogo `permissions` con claves granulares `{module}.{subjectType}.{subjectKey}.{action}` y
  sub-recursos `parent:child`.
- Jerarquía de roles (`roles.hierarchy_level`) con resolución acumulativa.
- Módulo Nest `auth`/`permissions` que resuelve permisos efectivos (función pura + `.spec.ts`).
- `PlanGuard` (módulo contratado) + `PermissionsGuard` (acción granular) + decorador
  `@RequirePermission(...)` en el backend.
- `GET /auth/me` devolviendo los **permisos efectivos** planos del usuario.
- Módulos Nest de configuración: `roles`, `profiles`, `modules`, `plans`, `subscriptions` (CRUD).
- Frontend: `PermissionsContext`, hook `usePermission()`, componente `<Can>`,
  `PermissionMatrixEditor`, y vistas de configuración (Roles, Perfiles, Módulos, Planes, Usuarios).
- Seed de permisos, módulos y roles iniciales (superadmin + role free/player default).

### No incluido

- Integración con un proveedor de pagos real (Stripe/PayPal): solo el modelo de precios y estados
  de suscripción; el cobro efectivo se difiere.
- Migración/mapeo de los 14 usuarios existentes a perfiles/planes (se decide la estrategia de
  default en la Fase 3).
- Multi-tenant / organizaciones.
- Auditoría completa de cambios de permisos (logs de quién editó qué).

## 4. Diseño técnico

El modelo de datos, la clave canónica de permisos y el algoritmo de resolución están definidos en
`ApprendeVr/Documentation/roles-perfiles-planes.md`. Resumen operativo:

- **Clave de permiso**: `module.subjectType.subjectKey.action` (ej. `songs.component.deleteButton.delete`),
  con sub-recursos `parent:child` (ej. `songs:delete`) y herencia hijo→padre.
- **Resolución efectiva** (función pura `permissions.util.ts`):
  `P_efectivo = (P_perfil con deny aplicado) ∩ M_plan`, donde `deny` siempre gana, `grant` solo
  vale si el plan incluye el módulo, y la jerarquía de roles otorga acumulativamente hacia arriba.
- **Backend**: `PlanGuard` (valida módulo contratado) + `PermissionsGuard` (valida acción granular),
  ambos responden `403` si fallan.
- **Frontend**: el payload de `/auth/me` alimenta un `PermissionsContext`; `<Can permission="...">`
  y `usePermission()` hacen lookup sobre `effectivePermissions` (nunca una matriz estática).
  Mientras carga (`isLoading`), `can()` retorna `true` para no ocultar UI.

### Opciones consideradas

| Opción | Decisión | Motivo |
|---|---|---|
| RBAC simple (solo roles, sin perfiles) | Descartada | No cubre la granularidad por vista/componente/elemento ni la herencia múltiple pedida. |
| ABAC completo (atributos + políticas) | Diferida | Demasiado complejo para esta fase; el modelo rol/perfil/plan cubre el caso pedido y es extensible. |
| **Rol + perfil (herencia múltiple) + plan como techo** | **Elegida** | Cumple los requisitos y mantiene editabilidad vía tablas. |

## 5. Archivos a modificar / crear

| Archivo | Acción |
|---|---|
| `ApprendeVr/backend/src/auth/entities/role.entity.ts` | Entidad `Role` → tabla `roles` (con `hierarchy_level`, `is_system`). |
| `ApprendeVr/backend/src/auth/entities/permission.entity.ts` | Entidad `Permission` → tabla `permissions`. |
| `ApprendeVr/backend/src/auth/entities/profile.entity.ts` | Entidad `Profile` → tabla `profiles`. |
| `ApprendeVr/backend/src/auth/entities/module.entity.ts` | Entidad `Module` → tabla `modules` (catálogo de módulos/vistas). |
| `ApprendeVr/backend/src/auth/entities/plan.entity.ts` | Entidad `Plan` → tabla `plans` (con `is_fixed`, `max_modules`). |
| `ApprendeVr/backend/src/auth/entities/subscription.entity.ts` | Entidad `Subscription` → tabla `subscriptions`. |
| `ApprendeVr/backend/src/auth/permissions.util.ts` | Función pura de resolución de permisos. |
| `ApprendeVr/backend/src/auth/permissions.util.spec.ts` | Unit tests de la resolución. |
| `ApprendeVr/backend/src/common/guards/plan.guard.ts` | Guard de módulo contratado (`checkPlanModuleAccess`). |
| `ApprendeVr/backend/src/common/guards/permissions.guard.ts` | Guard de acción granular. |
| `ApprendeVr/backend/src/common/decorators/require-permission.decorator.ts` | Decorador `@RequirePermission`. |
| `ApprendeVr/backend/src/auth/auth.service.ts` | Devolver `effectivePermissions` en login/me. |
| `ApprendeVr/backend/src/roles/*` | Módulo CRUD de roles. |
| `ApprendeVr/backend/src/profiles/*` | Módulo CRUD de perfiles. |
| `ApprendeVr/backend/src/modules/*` | Módulo CRUD del catálogo de módulos. |
| `ApprendeVr/backend/src/plans/*` | Módulo CRUD de planes y precios. |
| `ApprendeVr/backend/src/subscriptions/*` | Módulo de suscripciones (asignación + historial). |
| `ApprendeVr/backend/migrations/*-create-rbac-tables.ts` | Migración de tablas RBAC + `users.profile_id`/`users.role_id`. |
| `ApprendeVr/backend/src/**/seed/*.ts` | Seed de permisos + módulos + roles iniciales. |
| `ApprendeVr/frontend/**/PermissionsContext.tsx` | Contexto de permisos en el frontend. |
| `ApprendeVr/frontend/**/usePermission.ts` | Hook `usePermission()`. |
| `ApprendeVr/frontend/**/Can.tsx` | Componente `<Can permission="...">`. |
| `ApprendeVr/frontend/**/PermissionMatrixEditor.tsx` | Editor de matriz recurso × acción. |
| `ApprendeVr/frontend/**/vistas/*` | Vistas de config: Roles, Perfiles, Módulos, Planes, Usuarios. |
| `ApprendeVr/Documentation/roles-perfiles-planes.md` | (ya creado) contrato de arquitectura. |

## 6. Criterios de aceptación

- [ ] La migración crea las tablas RBAC + billing y `users.profile_id`/`users.role_id` sin romper
      la data existente.
- [ ] El catálogo `permissions` y `modules` se seedea con las claves granulares de los módulos
      actuales (`app`, `config`, `ars`, `songs`, `words`, `phrases`, `evaluations`, `users`,
      `videos`, `plans`), según la Fase 0.
- [ ] Los 3 roles default quedan sembrados: `superadmin` (todo, plan ilimitado sin vencimiento),
      `admin` (todo menos `config:*`, plan anual 365 días) y `player1` (solo `app:read` +
      `ars:mirror`, sin `ars:arTest`, plan free 30 días).
- [ ] El usuario `superadmin` se crea por seed (no hay flujo de registro para darlo de alta), con
      contraseña bcrypt tomada de `.env`, y puede hacer login en el primer arranque.
- [ ] `GET /auth/me` devuelve la lista **plana** de permisos efectivos calculada según
      `(P_perfil con deny) ∩ M_plan`.
- [ ] La jerarquía de roles es acumulativa: un rol superior hereda los permisos de los inferiores.
- [ ] Un usuario sin perfil (`profile_id = null`) usa su `role_id` de sistema como fallback.
- [ ] `@RequirePermission('songs:delete')` devuelve `403` a un usuario sin ese permiso y `200` a
      uno que sí lo tiene.
- [ ] `PlanGuard` devuelve `403 "módulo no incluido en tu plan"` para un módulo no contratado,
      incluso si el perfil lo incluye (el plan es el techo).
- [ ] Un `deny` en `profile_permissions` bloquea el acceso aunque el plan lo incluya.
- [ ] Un `grant` en `profile_permissions` NO otorga acceso si el plan no incluye ese módulo.
- [ ] La resolución de permisos es una función pura con `.spec.ts` y `npm test` pasa sin BD.
- [ ] Un administrador puede crear/editar roles, perfiles, módulos y planes desde las vistas de
      configuración (CRUD), y asignar plan + perfil a sub-usuarios dentro de su propio plan.
- [ ] El frontend oculta/deshabilita elementos restringidos con `<Can>`/`usePermission()` leyendo
      de `effectivePermissions` (nunca matriz estática), y maneja correctamente los `403`.
- [ ] Durante la carga inicial, `can()` retorna `true` (no oculta UI); tras recibir `/auth/me`
      aplica el filtrado real.
- [ ] No hay secretos ni precios sensibles hardcodeados.

## 7. Checklist de ejecución (paso a paso)

### Fase 0 — Seeds y catálogos de contrato (definir ANTES de la BD)

Estos datos son de **contrato**, no de negocio: el backend (`@RequirePermission`, `PlanGuard`) y
el frontend (`<Can>`, sidebar) referencian claves que deben existir en BD desde el día uno.
Se definen antes de escribir la migración para que ésta y el seed queden alineados.

- [ ] 0.1 Catálogo `modules` (tabla `modules`, `resource_id` único). Incluye los dominios de
      contenido y las vistas/UI de la app actual:

| `resource_id` | Nombre (es) | `is_transversal` | Notas |
|---|---|---|---|
| `app` | Aplicación / Inicio | sí | menú principal (`VRDisplay`) |
| `config` | Configuración de inicio | no | panel ⚙️ (`VRConfig`): idioma, tema, visibilidad |
| `ars` | Realidad aumentada (AR) | no | vistas `ARs/`, incluye `artest-mirror.html` |
| `aframe` | A-Frame | no | vista `A-frame/index.html` |
| `mobile` | Móvil | no | vista `mobile/mobile.html` |
| `songs` | Canciones | no | core |
| `words` | Palabras (Nivel 1/2) | no | — |
| `phrases` | Frases (Nivel 3) | no | — |
| `evaluations` | Evaluaciones | no | — |
| `users` | Usuarios | no | administración |
| `videos` | Videos (streaming) | no | — |
| `plans` | Planes / roles / perfiles | no | administración de RBAC y billing |

- [ ] 0.2 Catálogo `permissions` (clave canónica `module.subjectType.subjectKey.action`, con
      forma corta `resource:action`). Lista mínima inicial:

| Recurso | Acciones (seed) |
|---|---|
| `app` | `app:read` |
| `config` | `config:read`, `config:update` |
| `ars` | `ars:read`, `ars:mirror` (vista `artest-mirror.html`), `ars:arTest` (elemento "AR-TEST") |
| `aframe` | `aframe:read` |
| `mobile` | `mobile:read` |
| `songs` | `songs:read`, `songs:create`, `songs:update`, `songs:delete` |
| `words` | `words:read`, `words:create`, `words:update`, `words:delete` |
| `phrases` | `phrases:read`, `phrases:create`, `phrases:update`, `phrases:delete` |
| `evaluations` | `evaluations:read`, `evaluations:create`, `evaluations:update`, `evaluations:delete` |
| `users` | `users:read`, `users:create`, `users:update`, `users:delete`, `users:manage` |
| `videos` | `videos:read`, `videos:export` |
| `plans` | `plans:read`, `plans:manage` |

  Mapeo de granularidad concreta (vista/elemento) usado por los roles default:

| Clave | Tipo | Recurso UI real |
|---|---|---|
| `ars:mirror` | view | `src/views/ARs/ARScomponents/ARStest/mirror-fix/artest-mirror.html` |
| `ars:arTest` | component/element | botón "AR-TEST" en `ARTestMirrorButton.jsx:64` |
| `config:read` | module/menu | panel "Configuración de inicio" (`VRConfig.jsx`, botón ⚙️) |

- [ ] 0.3 Roles base `roles` (con `is_system` y `hierarchy_level`). **Tres roles por defecto:**

| Rol | `hierarchy_level` | `is_system` | Permisos seed |
|---|---|---|---|
| `superadmin` | 60 | sí | todos (acceso total, incluye `plans:manage` y `config:*`) |
| `admin` | 40 | sí | todo **menos** `config:*` (no ve el menú "Configuración de inicio") |
| `player1` | 20 | sí | solo `app:read` + `ars:mirror`; **sin** `ars:arTest` (no ve el elemento "AR-TEST") |

- [ ] 0.4 Planes iniciales `plans` + `plan_modules` + `plan_prices`:

| Plan | `plan_duration_days` | `is_fixed` | `plan_modules` (pool) |
|---|---|---|---|
| `ilimitado` | `null` (sin vencimiento) | sí | todos los módulos |
| `anual` | `365` | sí | todos **menos** `config` |
| `free` | `30` | sí | solo `app` + `ars` (vista `artest-mirror.html`) |

- [ ] 0.5 Usuarios seed `users` (con contraseña bcrypt) + suscripciones `subscriptions`:

  **El `superadmin` se crea directamente por seed en la BD** — no existe flujo de registro ni UI
  para darlo de alta en el sistema, por lo que debe nacer como dato de contrato. Su contraseña se
  fija vía `.env` (`SEED_SUPERADMIN_EMAIL`, `SEED_SUPERADMIN_PASSWORD`) y se hashea con bcrypt en
  el seed (nunca en claro). Es obligatorio cambiarla en el primer login.

| Usuario seed | Rol | Plan | `status` | `end_at` | Credenciales |
|---|---|---|---|---|---|
| superadmin (plataforma) | `superadmin` | `ilimitado` | `active` | `null` (sin vencimiento) | `SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD` |
| admin (ej. dueño) | `admin` | `anual` | `active` | `+1 año` | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` |
| player1 | `player1` | `free` | `active` | `+1 mes` | `SEED_PLAYER1_EMAIL` / `SEED_PLAYER1_PASSWORD` |

- [ ] 0.6 Mapeo de los usuarios existentes del dump `english_vr`: asignar `role_id = player1` y
      suscripción `free` (30 días) a todos, para no romper el login histórico. Los tres usuarios
      seed anteriores (superadmin/admin/player1) se crean aparte para demostrar el sistema.

### Fase 1 — Modelo de datos (migración + entidades)

- [ ] 1.1 Crear migración TypeORM con las tablas `roles`, `permissions`, `role_permissions`,
      `profiles`, `profile_roles`, `profile_permissions`, `modules`, `module_features`, `plans`,
      `plan_prices`, `plan_modules`, `subscriptions`, `subscription_changes`, `payments`.
- [ ] 1.2 Agregar columnas `users.profile_id` (FK nullable) y `users.role_id` (FK fallback) sin
      perder data.
- [ ] 1.3 Definir las entidades TypeORM (`Role`, `Permission`, `Profile`, `Module`, `Plan`,
      `Subscription`) mapeadas a las tablas, con relaciones M:N.
- [ ] 1.4 Implementar el seed de la Fase 0 (módulos, permisos, 3 roles base, 3 planes, 3 usuarios
      con contraseña bcrypt desde `.env`, y sus suscripciones) como runner idempotente (no duplica
      al re-ejecutar).

### Fase 2 — Resolución de permisos (backend, función pura)

- [ ] 2.1 `permissions.util.ts`: función pura `resolveEffectivePermissions({ planModules,
      rolePermissions, overrides })` que aplica `(grant/deny) ∩ plan` + jerarquía.
- [ ] 2.2 `permissions.util.spec.ts`: casos normales y de borde (deny gana, grant fuera del plan,
      jerarquía acumulativa, sin plan, perfil vacío, fallback a rol de sistema).
- [ ] 2.3 `PermissionsService`: carga plan activo + perfil + roles + overrides desde repos y
      delega a la función pura.

### Fase 3 — Guards y decoradores (backend)

- [ ] 3.1 `@RequirePermission(key)` decorador + metadato.
- [ ] 3.2 `PlanGuard` (valida módulo contratado vía `selected_modules`) + `PermissionsGuard`
      (valida acción granular).
- [ ] 3.3 `@CurrentUser()` devolviendo el usuario con permisos efectivos cacheados en la request.
- [ ] 3.4 `auth.service.ts`: incluir `effectivePermissions` en el payload de login y en `/auth/me`.

### Fase 4 — Módulos de configuración (backend CRUD)

- [ ] 4.1 `RolesModule`: CRUD de `roles` y gestión de `role_permissions` (con jerarquía).
- [ ] 4.2 `ProfilesModule`: CRUD de `profiles`, selección de roles base (`profile_roles`) y
      overrides (`profile_permissions`), validando contra el techo del plan.
- [ ] 4.3 `ModulesModule`: CRUD del catálogo de módulos (`modules`, `module_features`).
- [ ] 4.4 `PlansModule`: CRUD de `plans`, precios (`plan_prices`) y pool (`plan_modules`).
- [ ] 4.5 `SubscriptionsModule`: asignar plan + `selected_modules` a usuarios + historial
      (`subscription_changes`).

### Fase 5 — Frontend (contexto y vistas)

- [ ] 5.1 `PermissionsContext` + `usePermission()` que lean `effectivePermissions` de `/auth/me`.
- [ ] 5.2 Componente `<Can permission="...">` y utilidad para ocultar/deshabilitar.
- [ ] 5.3 Regla de carga: `can()` retorna `true` mientras `isLoading` (no ocultar UI).
- [ ] 5.4 Aplicar `<Can>` a los botones/elementos sensibles existentes (eliminar canción, guardar
      evaluación, editar nota).
- [ ] 5.5 `PermissionMatrixEditor` + vistas de configuración: Roles, Perfiles, Módulos, Planes y
      Usuarios (asignación de plan/perfil).

### Fase 6 — Verificación y cierre

- [ ] 6.1 `npm run build` compila sin errores en `ApprendeVr/backend/`.
- [ ] 6.2 `npm test` pasa (resolución de permisos sin BD).
- [ ] 6.3 Probar escenario del documento (plan Familiar + perfil Niño) contra la API con
      `curl`/Postman y verificar `403`/`200` esperados (incluye módulo no contratado).
- [ ] 6.4 Verificar que el frontend oculta los elementos restringidos y maneja `403`.
- [ ] 6.5 Marcar criterios de aceptación cumplidos y actualizar `roles-perfiles-planes.md` si
      cambió algo en la implementación.

## 8. Referencias

- Arquitectura RBAC: `ApprendeVr/Documentation/roles-perfiles-planes.md`.
- Backend NestJS: `ApprendeVr/Documentation/backend-nestjs.md`.
- Base de datos actual: `ApprendeVr/Documentation/database.md`.
- Skill de arquitectura backend: `.agents/skills/backend-nestjs/SKILL.md`.
- Requerimiento 004 (backend base): `Requerimientos/2-Developing/004-backend-nestjs-arquitectura-crud.md`.
- Referencia previa probada: sistemas de roles/permisos unificados y de gestión de planes de pago
  de proyectos desarrollados anteriormente.

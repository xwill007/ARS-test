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
  `profile_roles`, `profile_permissions`, `plans`, `plan_prices`, `plan_permissions`,
  `subscriptions`, y columna `users.profile_id`.
- Catálogo `permissions` con claves granulares `{module}.{subjectType}.{subjectKey}.{action}`.
- Módulo Nest `auth`/`permissions` que resuelve permisos efectivos (función pura + `.spec.ts`).
- `PermissionsGuard` + decorador `@RequirePermission(...)` en el backend.
- `GET /auth/me` (o `/users/me`) devolviendo los **permisos efectivos** del usuario.
- Módulos Nest de configuración: `roles`, `profiles`, `plans`, `subscriptions` (CRUD).
- Frontend: `PermissionsContext`, hook `usePermission()`, componente `<Can>`, y vistas de
  configuración (Roles, Perfiles, Planes, Usuarios).
- Seed de permisos y roles iniciales (superadmin + role free default).

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

- **Clave de permiso**: `module.subjectType.subjectKey.action` (ej. `songs.component.deleteButton.delete`).
- **Resolución efectiva** (función pura `permissions.util.ts`):
  `P_efectivo = (P_perfil con deny aplicado) ∩ P_plan`, donde `deny` siempre gana y `grant` solo
  vale si el plan lo incluye.
- **Backend**: guard global `PermissionsGuard` consulta los permisos efectivos cacheados en la
  request y responde `403` si falta el permiso requerido.
- **Frontend**: el payload de `/auth/me` alimenta un `PermissionsContext`; `<Can permission="...">`
  y `usePermission()` ocultan/deshabilitan UI. Nunca es la única barrera.

### Opciones consideradas

| Opción | Decisión | Motivo |
|---|---|---|
| RBAC simple (solo roles, sin perfiles) | Descartada | No cubre la granularidad por vista/componente/elemento ni la herencia múltiple pedida. |
| ABAC completo (atributos + políticas) | Diferida | Demasiado complejo para esta fase; el modelo rol/perfil/plan cubre el caso pedido y es extensible. |
| **Rol + perfil (herencia múltiple) + plan como techo** | **Elegida** | Cumple los requisitos y mantiene editabilidad vía tablas. |

## 5. Archivos a modificar / crear

| Archivo | Acción |
|---|---|
| `ApprendeVr/backend/src/auth/entities/role.entity.ts` | Entidad `Role` → tabla `roles`. |
| `ApprendeVr/backend/src/auth/entities/permission.entity.ts` | Entidad `Permission` → tabla `permissions`. |
| `ApprendeVr/backend/src/auth/entities/profile.entity.ts` | Entidad `Profile` → tabla `profiles`. |
| `ApprendeVr/backend/src/auth/entities/plan.entity.ts` | Entidad `Plan` → tabla `plans`. |
| `ApprendeVr/backend/src/auth/entities/subscription.entity.ts` | Entidad `Subscription` → tabla `subscriptions`. |
| `ApprendeVr/backend/src/auth/permissions.util.ts` | Función pura de resolución de permisos. |
| `ApprendeVr/backend/src/auth/permissions.util.spec.ts` | Unit tests de la resolución. |
| `ApprendeVr/backend/src/common/guards/permissions.guard.ts` | Guard global de permisos. |
| `ApprendeVr/backend/src/common/decorators/require-permission.decorator.ts` | Decorador `@RequirePermission`. |
| `ApprendeVr/backend/src/auth/auth.service.ts` | Devolver `permissions` en login/me. |
| `ApprendeVr/backend/src/roles/*` | Módulo CRUD de roles. |
| `ApprendeVr/backend/src/profiles/*` | Módulo CRUD de perfiles. |
| `ApprendeVr/backend/src/plans/*` | Módulo CRUD de planes y precios. |
| `ApprendeVr/backend/src/subscriptions/*` | Módulo de suscripciones (asignación + historial). |
| `ApprendeVr/backend/migrations/*-create-rbac-tables.ts` | Migración de tablas RBAC + `users.profile_id`. |
| `ApprendeVr/backend/src/**/seed/*.ts` | Seed de permisos + roles iniciales. |
| `ApprendeVr/frontend/**/PermissionsContext.tsx` | Contexto de permisos en el frontend. |
| `ApprendeVr/frontend/**/usePermission.ts` | Hook `usePermission()`. |
| `ApprendeVr/frontend/**/Can.tsx` | Componente `<Can permission="...">`. |
| `ApprendeVr/frontend/**/vistas/*` | Vistas de config: Roles, Perfiles, Planes, Usuarios. |
| `ApprendeVr/Documentation/roles-perfiles-planes.md` | (ya creado) contrato de arquitectura. |

## 6. Criterios de aceptación

- [ ] La migración crea las tablas RBAC y `users.profile_id` sin romper la data existente.
- [ ] El catálogo `permissions` se seedea con las claves granulares de los módulos actuales
      (`songs`, `words`, `phrases`, `evaluations`, `users`, `videos`, `config`).
- [ ] `GET /auth/me` devuelve la lista de **permisos efectivos** calculada según
      `P_perfil ∩ P_plan`.
- [ ] `@RequirePermission('songs.component.deleteButton.delete')` devuelve `403` a un usuario sin
      ese permiso y `200` a uno que sí lo tiene.
- [ ] Un `deny` en `profile_permissions` bloquea el acceso aunque el plan lo incluya.
- [ ] Un `grant` en `profile_permissions` NO otorga acceso si el plan no incluye ese permiso
      (el plan es el techo).
- [ ] La resolución de permisos es una función pura con `.spec.ts` y `npm test` pasa sin BD.
- [ ] Un administrador puede crear/editar roles, perfiles y planes desde las vistas de
      configuración (CRUD), y asignar plan + perfil a sub-usuarios dentro de su propio plan.
- [ ] El frontend oculta/deshabilita elementos restringidos con `<Can>`/`usePermission()` y maneja
      correctamente los `403` de la API.
- [ ] No hay secretos ni precios sensibles hardcodeados.

## 7. Checklist de ejecución (paso a paso)

### Fase 1 — Modelo de datos (migración + entidades)

- [ ] 1.1 Crear migración TypeORM con las tablas `roles`, `permissions`, `role_permissions`,
      `profiles`, `profile_roles`, `profile_permissions`, `plans`, `plan_prices`,
      `plan_permissions`, `subscriptions`.
- [ ] 1.2 Agregar columna `users.profile_id` (FK a `profiles`, nullable) sin perder data.
- [ ] 1.3 Definir las entidades TypeORM (`Role`, `Permission`, `Profile`, `Plan`, `Subscription`)
      mapeadas a las tablas, con relaciones M:N (`role_permissions`, `profile_roles`,
      `profile_permissions`, `plan_permissions`).
- [ ] 1.4 Seed de permisos iniciales (claves granulares) y roles base (`superadmin` con
      `is_system = true`, `free`/`player` default).

### Fase 2 — Resolución de permisos (backend, función pura)

- [ ] 2.1 `permissions.util.ts`: función pura `resolveEffectivePermissions({ planPerms, rolePerms,
      overrides })` que aplica `(grant/deny) ∩ plan`.
- [ ] 2.2 `permissions.util.spec.ts`: casos normales y de borde (deny gana, grant fuera del plan,
      sin plan, perfil vacío).
- [ ] 2.3 `PermissionsService`: carga plan activo + perfil + roles + overrides desde repos y
      delega a la función pura.

### Fase 3 — Guards y decoradores (backend)

- [ ] 3.1 `@RequirePermission(key)` decorador + metadato.
- [ ] 3.2 `PermissionsGuard` global que resuelve permisos efectivos y valida la ruta.
- [ ] 3.3 `@CurrentUser()` devolviendo el usuario con permisos efectivos cacheados en la request.
- [ ] 3.4 `auth.service.ts`: incluir `permissions` en el payload de login y en `/auth/me`.

### Fase 4 — Módulos de configuración (backend CRUD)

- [ ] 4.1 `RolesModule`: CRUD de `roles` y gestión de `role_permissions`.
- [ ] 4.2 `ProfilesModule`: CRUD de `profiles`, selección de roles base (`profile_roles`) y
      overrides (`profile_permissions`), validando contra el techo del plan.
- [ ] 4.3 `PlansModule`: CRUD de `plans`, precios (`plan_prices`) y permisos otorgados
      (`plan_permissions`).
- [ ] 4.4 `SubscriptionsModule`: asignar plan activo a usuarios + historial de cambios de plan.

### Fase 5 — Frontend (contexto y vistas)

- [ ] 5.1 `PermissionsContext` + `usePermission()` que lean los permisos de `/auth/me`.
- [ ] 5.2 Componente `<Can permission="...">` y utilidad para ocultar/deshabilitar.
- [ ] 5.3 Aplicar `<Can>` a los botones/elementos sensibles existentes (eliminar canción, guardar
      evaluación, editar nota).
- [ ] 5.4 Vistas de configuración: Roles, Perfiles, Planes y Usuarios (asignación de plan/perfil).

### Fase 6 — Verificación y cierre

- [ ] 6.1 `npm run build` compila sin errores en `ApprendeVr/backend/`.
- [ ] 6.2 `npm test` pasa (resolución de permisos sin BD).
- [ ] 6.3 Probar escenario del documento (plan Familiar + perfil Niño) contra la API con
      `curl`/Postman y verificar `403`/`200` esperados.
- [ ] 6.4 Verificar que el frontend oculta los elementos restringidos y maneja `403`.
- [ ] 6.5 Marcar criterios de aceptación cumplidos y actualizar `roles-perfiles-planes.md` si
      cambió algo en la implementación.

## 8. Referencias

- Arquitectura RBAC: `ApprendeVr/Documentation/roles-perfiles-planes.md`.
- Backend NestJS: `ApprendeVr/Documentation/backend-nestjs.md`.
- Base de datos actual: `ApprendeVr/Documentation/database.md`.
- Skill de arquitectura backend: `.agents/skills/backend-nestjs/SKILL.md`.
- Requerimiento 004 (backend base): `Requerimientos/2-Developing/004-backend-nestjs-arquitectura-crud.md`.

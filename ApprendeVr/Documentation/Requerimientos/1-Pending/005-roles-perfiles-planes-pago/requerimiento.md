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

## 8. Referencias

- Arquitectura RBAC: `ApprendeVr/Documentation/roles-perfiles-planes.md`.
- Backend NestJS: `ApprendeVr/Documentation/backend-nestjs.md`.
- Base de datos actual: `ApprendeVr/Documentation/database.md`.
- Skill de arquitectura backend: `.agents/skills/backend-nestjs/SKILL.md`.
- Requerimiento 004 (backend base): `Requerimientos/2-Developing/004-backend-nestjs-arquitectura-crud.md`.
- Referencia previa probada: sistemas de roles/permisos unificados y de gestión de planes de pago
  de proyectos desarrollados anteriormente.

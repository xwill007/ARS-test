# Arquitectura de Roles, Perfiles y Planes de Pago (RBAC granular)

Documento base que define el **modelo de autorización** de `ApprendeVr`: roles, perfiles
granulares por módulo/vista/componente/elemento, y planes de pago con precios y acceso, todo
**editable desde tablas**. Es la fuente de verdad para implementar el control de acceso en el
backend NestJS (`ApprendeVr/backend/`) y en el frontend (`ApprendeVr/frontend/`).

> Este documento es el contrato de arquitectura del sistema de permisos; el requerimiento puntual
> de implementación vive en `Requerimientos/1-Pending/005-roles-perfiles-planes-pago.md`.

## 1. Objetivo y concepto

Permitir **restringir el acceso a elementos definidos** (módulos, vistas, componentes, elementos)
de forma granular y administrable, combinando:

- **Roles** — colecciones base de permisos.
- **Perfiles** — extienden uno o varios roles y añaden ajustes finos (grant/deny por elemento).
- **Planes de pago** — otorgan acceso a módulos/vistas y definen precios; son el **límite
  superior** de lo que un perfil puede conceder.

**Regla de oro:** el plan es el techo. Un perfil (aunque lo cree un administrador de ese plan)
**nunca** puede otorgar más acceso del que el plan habilita. El perfil solo puede *restringir*
dentro de lo permitido por el plan.

```
Plan (techo de acceso)
   │  limita a
   ▼
Perfil (extiende N roles + overrides grant/deny)
   │  define el acceso efectivo del usuario
   ▼
Usuario (tiene 1 perfil activo + 1 plan activo con historial)
```

## 2. Modelo de permisos (granularidad)

Un permiso identifica un **recurso** + una **acción**. El recurso tiene 4 niveles de
granularidad:

| Nivel | Qué restringe | Ejemplo de clave |
|---|---|---|
| `module` | todo un módulo | `songs.module.read`, `evaluations.module.manage` |
| `view` | una vista/pantalla | `songs.view.list.read`, `songs.view.detail.read` |
| `component` | un componente de UI | `songs.component.deleteButton.delete` |
| `element` | un elemento/campo concreto | `songs.element.noteField.update`, `songs.element.total.read` |

### 2.1 Clave canónica del permiso

```
{module}.{subjectType}.{subjectKey}.{action}
```

- `module`: nombre del módulo (inglés): `songs`, `words`, `phrases`, `evaluations`, `users`,
  `videos`, `auth`, `config`, `billing`.
- `subjectType`: `module` | `view` | `component` | `element`.
- `subjectKey`: identificador del recurso dentro del módulo (`list`, `detail`, `deleteButton`,
  `noteField`, ...).
- `action`: `read` | `create` | `update` | `delete` | `manage` | `export`.

Ejemplos:

```
songs.view.list.read
songs.component.deleteButton.delete
evaluations.view.history.read
config.view.plans.update
videos.element.download.export
```

Cada clave existe como fila en la tabla `permissions` (catálogo editable). Esto permite que un
administrador agregue/quiten permisos desde una vista de configuración sin tocar código.

## 3. Modelo de datos (tablas)

Todas las tablas nuevas usan **nombres en inglés** (coherente con el backend Nest y la migración
de renombrado de `backend-nestjs.md`).

### 3.1 Roles y permisos

| Tabla | Propósito | Campos principales |
|---|---|---|
| `roles` | Roles base (plantillas de permisos) | `id`, `name`, `slug`, `description`, `is_system` |
| `permissions` | Catálogo de permisos granulares | `id`, `module`, `subject_type`, `subject_key`, `action`, `key` (único), `description` |
| `role_permissions` | Relación rol ↔ permiso (M:N) | `role_id`, `permission_id` |

### 3.2 Perfiles

| Tabla | Propósito | Campos principales |
|---|---|---|
| `profiles` | Perfiles que extienden roles | `id`, `name`, `slug`, `description`, `plan_id` (techo opcional) |
| `profile_roles` | Perfil ↔ rol (M:N, "extiende varios roles") | `profile_id`, `role_id` |
| `profile_permissions` | Override granular del perfil | `profile_id`, `permission_id`, `effect` (`grant`/`deny`) |

### 3.3 Planes de pago

| Tabla | Propósito | Campos principales |
|---|---|---|
| `plans` | Planes disponibles | `id`, `name`, `slug`, `description`, `is_active` |
| `plan_prices` | Historial de precios por plan | `id`, `plan_id`, `amount`, `currency`, `interval` (`month`/`year`/`once`), `valid_from`, `valid_to` |
| `plan_permissions` | Módulos/vistas/permisos que otorga el plan | `plan_id`, `permission_id` |

### 3.4 Asignación a usuarios

| Tabla | Propósito | Campos principales |
|---|---|---|
| `users` (existente) | + `profile_id` (FK a `profiles`) | perfil activo del usuario |
| `subscriptions` | Plan activo + historial de cambios | `id`, `user_id`, `plan_id`, `status` (`active`/`trialing`/`canceled`/`expired`), `start_at`, `end_at` |

### 3.5 Diagrama de relaciones

```
permissions ──< role_permissions >── roles ──< profile_roles >── profiles
                 │                                             │  │
                 │                          profile_permissions┘  │
                 │                              (grant/deny)      │
                 │                                                │
plan_permissions ──< plans ──< subscriptions >── users ──< profile_id
                      │                            │
plan_prices ──────────┘                            └── 1 plan activo + historial
```

## 4. Resolución de permisos efectivos

Dado un usuario autenticado, el permiso efectivo se calcula así:

1. **Plan activo** (`subscriptions` con `status = 'active'`): da el conjunto `P_plan` (unión de
   `plan_permissions`). Si no hay plan activo → solo permisos del rol "free"/default.
2. **Perfil activo** (`users.profile_id`): 
   - `R_perfil` = unión de permisos de todos los roles vía `profile_roles` → `role_permissions`.
   - Aplicar overrides de `profile_permissions`: `grant` añade, `deny` quita → `P_perfil`.
3. **Permiso efectivo** = `P_perfil ∩ P_plan`, con prioridad del `deny`.

```
P_efectivo = (P_perfil con deny aplicado) ∩ P_plan
```

Reglas:

- Un `deny` en `profile_permissions` **siempre gana** (ni siquiera el plan puede reactivarlo).
- Un `grant` en `profile_permissions` **solo es válido si el plan lo incluye** (el plan es el techo).
- El superadmin del sistema (`is_system = true` en su rol, o flag de superusuario) ignora el plan
  y tiene acceso total — para administración de la plataforma.
- Los roles marcados `is_system = true` no pueden editarse desde la UI de un plan; solo desde la
  administración global.

## 5. Aplicación de la restricción (frontend + backend)

Defensa en profundidad: **ambas capas validan**, el backend es la fuente de verdad.

### 5.1 Backend (autoritativo)

- Guard global `PermissionsGuard` + decorador `@RequirePermission('songs.component.deleteButton.delete')`.
- Al autenticar, se cargan los permisos efectivos del usuario (sección 4) y se cachean en el
  contexto de la request (o en memoria con invalidación).
- El guard compara el permiso requerido por la ruta contra los permisos efectivos → `403` si falta.
- La resolución vive en una **función pura** (`permissions.util.ts`), unit-testable sin BD
  (cumple la regla de funciones simples del skill `backend-nestjs`).

### 5.2 Frontend (experiencia de usuario)

- El endpoint `GET /auth/me` (o `/users/me`) devuelve los **permisos efectivos** del usuario.
- Un contexto `PermissionsContext` (React) expone `can('songs.component.deleteButton.delete')`.
- Componentes reusables: `<Can permission="...">` (render condicional) y `usePermission()` hook.
- Los elementos restringidos se **ocultan o deshabilitan** según el permiso. El frontend nunca es
  la única barrera: si un request recibe `403`, se muestra el estado de "sin acceso".

## 6. Administración (vistas y tablas de configuración)

Se crean vistas de configuración para que los administradores editen sin tocar código:

| Vista | Permite | Tablas que edita |
|---|---|---|
| **Roles** | Crear/editar roles y sus permisos | `roles`, `role_permissions` |
| **Perfiles** | Crear/editar perfiles, elegir roles base y overrides | `profiles`, `profile_roles`, `profile_permissions` |
| **Planes** | Crear/editar planes, precios y qué módulos/vistas otorgan | `plans`, `plan_prices`, `plan_permissions` |
| **Usuarios** | Asignar plan, perfil y crear sub-usuarios | `users`, `subscriptions` |

**Jerarquía de administración:** un usuario cuyo plan le otorga `config.module.manage` puede
crear **sub-usuarios** y asignarles roles/perfiles **dentro de lo permitido por su propio plan**
(ej. un plan "familiar" puede crear perfiles "niño" que restrinjan canciones, niveles de
complejidad, o la eliminación de evaluaciones — pero no puede otorgar un módulo que su plan no
incluye).

## 7. Ejemplo concreto de uso

Escenario: plan **Familiar** (acceso a `songs` y `evaluations`, pero no a `config`).

1. `plan_permissions` del plan Familiar: `songs.*`, `evaluations.*`. Sin `config.module.*`.
2. El admin del plan crea el perfil **Niño**:
   - `profile_roles`: hereda el rol `player` (solo `read` de songs/evaluations).
   - `profile_permissions` deny: `songs.component.deleteButton.delete`,
     `songs.element.noteField.update` (no puede borrar canciones ni editar notas).
3. El admin crea un usuario `hijo` con `profile_id = Niño` y le asigna el plan Familiar.
4. Efectivo del `hijo`: `songs.view.list.read` sí, `songs.component.deleteButton.delete` no,
   `config.*` no (el plan no lo incluye, aunque el perfil lo pidiera).

## 8. Convenciones y reglas

- **Idioma**: nombres de tablas, columnas, claves de permiso y código en **inglés**.
- **Funciones simples**: la resolución de permisos (`permissions.util.ts`) es una función pura con
  su `.spec.ts` (regla del skill `backend-nestjs`).
- **Sin sincronización automática**: cambios de esquema vía migraciones TypeORM (`synchronize: false`).
- **Secretos**: precios y billing sensibles nunca en código; vía `.env` y proveedor de pagos.
- **Integración** con el backend: módulo `auth` devuelve `permissions` en el payload de login/me.

## 9. Referencias

- Backend NestJS: `ApprendeVr/Documentation/backend-nestjs.md`.
- Base de datos actual: `ApprendeVr/Documentation/database.md`.
- Skill de arquitectura backend: `.agents/skills/backend-nestjs/SKILL.md`.
- Requerimiento de implementación: `Requerimientos/1-Pending/005-roles-perfiles-planes-pago.md`.

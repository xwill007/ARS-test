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

## 1.1 Antecedente: patrones probados en proyectos anteriores

Este sistema se basa en implementaciones previas de **otros proyectos desarrollados** que ya
resolvieron en producción dos requerimientos análogos:

- **Roles y permisos unificados**: RBAC granular con jerarquía de roles, matriz de permisos,
  roles personalizables y hooks de frontend (`useCan`, `<Can>`).
- **Gestión de planes de pago**: planes con precio, pool de módulos, cupo de selección
  (`maxModules`), plan fijo vs editable (`isFixed`), y enforcement backend por módulo contratado.

Se adoptan los siguientes patrones probados (adaptados al alcance menor de `ApprendeVr`):

| Patrón (proyectos anteriores) | Cómo se adopta acá |
|---|---|
| `hierarchyLevel` en rol + jerarquía acumulativa (superadmin 60 > owner 50 > admin 40 > operator 30 > agent 20 > viewer 10) | `roles.hierarchy_level`; un rol superior hereda los permisos de los inferiores. |
| `isSystem` en roles (no editables/borrables) | `roles.is_system`; solo se editan desde la administración global. |
| `RolePermission(roleId, resource, action)` + sub-recursos `parent:child` | `role_permissions` + clave `module.subjectType.subjectKey.action`, con sub-recursos (`songs:delete`, `evaluations:edit`). |
| Fallback a rol de sistema cuando el usuario no tiene perfil custom | Un usuario sin `profile_id` usa su `role` de sistema (compatibilidad). |
| `GET /auth/me` devuelve `effectivePermissions` planos | `GET /auth/me` devuelve la lista plana de permisos efectivos; el frontend **nunca** recalcula desde una matriz estática. |
| Planes: `modules` (pool), `maxModules` (cupo), `isFixed` (fijo), `selectedModules` (lo elegido) | Tablas `modules`, `plan_modules` y `subscriptions.selected_modules` (ver §3.3). |
| `checkPlanModuleAccess(companyId, resource)` → 403 "módulo no incluido en tu plan" | `PlanGuard` valida que el módulo esté dentro del plan antes de evaluar permisos. |
| Historial de cambios de plan con prorrateo (`PlanChangeRecord`) | `subscriptions` + `subscription_changes` (historial con saldo a favor). |

> ⚠️ **Lección crítica de proyectos anteriores:** el backend bloqueaba bien (403), pero el
> sidebar/frontend consultaba la matriz estática en vez de los permisos efectivos, mostrando
> módulos que el usuario no debía ver. Acá se evita desde el inicio: **una sola fuente de verdad**
> — los permisos efectivos viajan en `/auth/me` y el frontend solo hace lookup sobre ese conjunto.

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

### 2.2 Sub-recursos y herencia `parent:child`

Se adopta la convención de proyectos anteriores: un recurso puede ser un **sub-recurso** de un
padre, escrito con `:`. La regla de herencia es:

- Otorgar un permiso de sub-recurso (hijo) habilita la lectura del padre. Ej. tener
  `songs:delete` o `songs.component.deleteButton.delete` habilita `songs.view.list.read` (ver el
  módulo "Canciones" en el sidebar).
- Un permiso de módulo (`songs.module.read`) NO habilita automáticamente los sub-recursos; cada
  sub-recurso se otorga explícitamente (o se hereda por jerarquía de rol, §4).

Esto permite granularizar (ej. `evaluations:delete` restringido a un perfil) sin romper la
navegación general.

### 2.3 Acciones y mapeo HTTP

| Acción | Verbo HTTP | Uso típico |
|---|---|---|
| `read` | `GET` | listar/ver |
| `create` | `POST` | alta |
| `update` | `PUT`/`PATCH` | edición |
| `delete` | `DELETE` | borrado |
| `manage` | cualquiera | administración del módulo (config) |
| `export` | `GET` | descarga/exportación |

## 3. Modelo de datos (tablas)

Todas las tablas nuevas usan **nombres en inglés** (coherente con el backend Nest y la migración
de renombrado de `backend-nestjs.md`).

### 3.1 Roles y permisos

| Tabla | Propósito | Campos principales |
|---|---|---|
| `roles` | Roles base (plantillas de permisos) | `id`, `name`, `slug`, `description`, `is_system`, `hierarchy_level` |
| `permissions` | Catálogo de permisos granulares | `id`, `module`, `subject_type`, `subject_key`, `action`, `key` (único), `description` |
| `role_permissions` | Relación rol ↔ permiso (M:N) | `role_id`, `permission_id` |

- `hierarchy_level`: número que define la jerarquía acumulativa (mayor = más privilegios). Roles
  de sistema propuestos: `superadmin` 60, `owner` 50, `admin` 40, `editor` 30, `player` 20,
  `viewer` 10. Un rol superior hereda los permisos de los inferiores (§4).
- `is_system`: roles fijos no editables/borrables desde la UI de un plan; solo desde la
  administración global.

### 3.2 Perfiles

| Tabla | Propósito | Campos principales |
|---|---|---|
| `profiles` | Perfiles que extienden roles | `id`, `name`, `slug`, `description`, `plan_id` (techo opcional), `is_system` |
| `profile_roles` | Perfil ↔ rol (M:N, "extiende varios roles") | `profile_id`, `role_id` |
| `profile_permissions` | Override granular del perfil | `profile_id`, `permission_id`, `effect` (`grant`/`deny`) |

### 3.3 Planes de pago (modelo de módulos)

Siguiendo el patrón de proyectos anteriores, los planes se modelan sobre un **catálogo de módulos** (no
permisos sueltos), separando el *pool disponible* del *módulo realmente contratado*:

| Tabla | Propósito | Campos principales |
|---|---|---|
| `modules` | Catálogo de módulos/vistas vendibles | `id`, `resource_id` (único, ej. `songs`), `name_es`, `name_en`, `icon`, `category`, `is_transversal`, `is_active`, `price_monthly`, `requires_module_id` |
| `plans` | Planes disponibles | `id`, `slug`, `name_es`, `name_en`, `description`, `is_fixed`, `max_modules`, `is_active`, `is_popular`, `sort_order`, `plan_duration_days` |
| `plan_prices` | Historial de precios por plan | `id`, `plan_id`, `amount`, `currency`, `interval` (`month`/`year`/`once`), `valid_from`, `valid_to` |
| `plan_modules` | Módulos del pool de un plan (M:N) | `plan_id`, `module_id`, `is_required`, `is_included` |
| `module_features` | Funcionalidades/sub-vistas dentro de un módulo | `id`, `module_id`, `resource_id` (sub-recurso), `name_es`, `is_required` |

Conceptos clave (heredados de proyectos anteriores):

- **`is_transversal`** (en `modules`): módulo siempre presente en todos los planes (ej. dashboard,
  perfil de usuario). No se vende ni se desmarca.
- **`is_fixed`** (en `plans`): si `true`, el plan asigna automáticamente todos sus módulos (plan
  básico). Si `false`, el usuario elige hasta `max_modules` del pool.
- **`is_required`** (en `plan_modules`): módulo que viene obligatoriamente marcado en un plan.
- **`requires_module_id`** (en `modules`): dependencia entre módulos (ej. "evaluaciones" requiere
  "canciones").
- El precio puede venir del plan (`plan_prices`) y/o del módulo electivo (`modules.price_monthly`),
  igual que en proyectos anteriores (módulos electivos con precio individual).

### 3.4 Asignación a usuarios y billing

| Tabla | Propósito | Campos principales |
|---|---|---|
| `users` (existente) | + `profile_id` (FK a `profiles`) + `role_id` (rol de sistema fallback) | perfil activo + rol de sistema |
| `subscriptions` | Plan activo + módulos elegidos | `id`, `user_id`, `plan_id`, `selected_modules` (JSON), `status`, `start_at`, `end_at` |
| `subscription_changes` | Historial de cambios de plan (con prorrateo) | `id`, `subscription_id`, `from_plan_id`, `to_plan_id`, `days_consumed`, `saldo_a_favor`, `charged`, `created_at` |
| `payments` | Pagos de plan (auditoría) | `id`, `subscription_id`, `type` (`activation`/`upgrade`/`recharge`), `amount`, `currency`, `status`, `gateway`, `reference` |

- `users.role_id` + `users.profile_id`: si el usuario **no** tiene perfil, usa el `role_id` de
  sistema (fallback, como en proyectos anteriores). Si tiene perfil, el perfil manda y el `role_id` queda como
  respaldo.
- `subscriptions.status`: `trialing` | `active` | `past_due` | `suspended` | `canceled` |
  `pending_payment` (enum de proyectos anteriores).
- `subscriptions.selected_modules`: lo que el usuario **realmente** contrató (para planes no
  fijos), que es lo que el enforcement valida — no el pool completo del plan.

### 3.5 Diagrama de relaciones

```
permissions ──< role_permissions >── roles ──< profile_roles >── profiles
                 │                              (jerarquía)      │  │
                 │                          profile_permissions┘  │
                 │                              (grant/deny)      │
                 │                                                │
modules ──< module_features                                     users ── profile_id
   │                                                            │  │
   │  ┌────────────┐                                            │  └── role_id (fallback)
   └─< plan_modules >── plans ──< subscriptions ────────────────┘
          (pool)      │  │              │  (selected_modules)
                      │  └─< plan_prices │
                      │                 └──< subscription_changes (historial)
                      └─< ...payments (auditoría)
```

## 4. Resolución de permisos efectivos

Dado un usuario autenticado, el permiso efectivo se calcula en dos niveles independientes
(enforcement en dos capas, como en proyectos anteriores): **plan** (¿contrató el módulo?) y **permiso**
(¿su rol/perfil le da esa acción?).

### 4.1 Nivel plan (techo)

1. Se obtiene la suscripción activa (`subscriptions.status = 'active' | 'trialing'`).
2. `M_plan` = `selected_modules` si el plan no es fijo, o `plan_modules` completo si `is_fixed`.
3. Si el módulo del permiso no está en `M_plan` → **403 "módulo no incluido en tu plan"** (antes de
   evaluar nada más). El superadmin (`is_system` de plataforma) ignora esta barrera.
4. Los módulos `is_transversal` siempre están habilitados.

### 4.2 Nivel permiso (rol + perfil)

1. **Perfil activo** (`users.profile_id`):
   - `R_perfil` = unión de permisos de todos los roles del perfil (`profile_roles` →
     `role_permissions`), **aplicando jerarquía**: cada rol aporta también los permisos de los
     roles de nivel inferior.
   - Aplicar overrides de `profile_permissions`: `grant` añade, `deny` quita → `P_perfil`.
2. **Fallback**: si el usuario no tiene perfil, `P_perfil` se deriva de su `role_id` de sistema +
   jerarquía.
3. **Permiso efectivo** = `P_perfil ∩ M_plan`, con `deny` siempre ganando.

```
P_efectivo = (P_perfil con deny aplicado) ∩ M_plan
```

Reglas:

- Un `deny` en `profile_permissions` **siempre gana** (ni el plan ni la jerarquía lo reactivan).
- Un `grant` en `profile_permissions` **solo es válido si el plan incluye el módulo** (el plan es
  el techo).
- La **jerarquía** solo otorga hacia arriba dentro de los roles del perfil; no atraviesa el techo
  del plan.
- El superadmin de plataforma (`role.is_system` + `hierarchy_level` máximo) ignora plan y perfil.
- Los roles/perfiles `is_system` no pueden editarse desde la UI de un plan; solo desde la
  administración global.

### 4.3 Función pura

La resolución vive en `permissions.util.ts` como **función pura** (sin BD), unit-testable:

```ts
resolveEffectivePermissions({
  planModules: string[],        // M_plan (resource_ids)
  rolePermissions: string[],    // unión con jerarquía
  overrides: { key, effect }[], // grant/deny del perfil
}): Set<string>
```

El service (`PermissionsService`) carga los datos desde los repositorios y delega a la función
pura (regla del skill `backend-nestjs`).

## 5. Aplicación de la restricción (frontend + backend)

Defensa en profundidad: **ambas capas validan**, el backend es la fuente de verdad.

### 5.1 Backend (autoritativo)

- Guard global `PermissionsGuard` + decorador `@RequirePermission('songs.component.deleteButton.delete')`.
- Dos capas de enforcement en el guard (como en proyectos anteriores): primero `PlanGuard`
  (`checkPlanModuleAccess`) valida que el módulo esté contratado; luego `PermissionsGuard` valida
  la acción granular. Ambas responden `403` si fallan.
- Al autenticar, se cargan los permisos efectivos del usuario (sección 4) y se cachean en el
  contexto de la request (o en memoria/Redis con TTL e invalidación).
- La resolución vive en una **función pura** (`permissions.util.ts`), unit-testable sin BD
  (cumple la regla de funciones simples del skill `backend-nestjs`).

### 5.2 Frontend (experiencia de usuario)

- El endpoint `GET /auth/me` devuelve **la lista plana de permisos efectivos**
  (`effectivePermissions: string[]`) — **una sola fuente de verdad**. El frontend **nunca**
  recalcula desde una matriz estática (lección de proyectos anteriores).
- Un contexto `PermissionsContext` (React) guarda ese `Set<string>` y expone
  `can('songs.component.deleteButton.delete')`.
- Componentes reusables: `<Can permission="...">` (render condicional) y `usePermission()` hook
  que hacen lookup por `Set.has()`.
- **Regla de carga:** mientras los permisos no hayan llegado (`isLoading`), `can()` retorna `true`
  para no ocultar/parpadear la UI durante la carga inicial (patrón de proyectos anteriores). Solo tras recibir
  `/auth/me` se aplica el filtrado real.
- Los elementos restringidos se **ocultan o deshabilitan** según el permiso. El frontend nunca es
  la única barrera: si un request recibe `403`, se muestra el estado de "sin acceso".

## 6. Administración (vistas y tablas de configuración)

Se crean vistas de configuración para que los administradores editen sin tocar código:

| Vista | Permite | Tablas que edita |
|---|---|---|
| **Roles** | Crear/editar roles y sus permisos | `roles`, `role_permissions` |
| **Perfiles** | Crear/editar perfiles, elegir roles base y overrides | `profiles`, `profile_roles`, `profile_permissions` |
| **Planes** | Crear/editar planes, precios y qué módulos otorgan | `plans`, `plan_prices`, `plan_modules` |
| **Módulos** | Catálogo de módulos/vistas vendibles (precio, dependencias) | `modules`, `module_features` |
| **Usuarios** | Asignar plan, perfil, rol y crear sub-usuarios | `users`, `subscriptions` |

El editor de permisos usa un componente **`PermissionMatrixEditor`** (matriz de recursos ×
acciones con checkboxes), reutilizable en Roles y Perfiles (patrón de proyectos anteriores). Los roles/perfiles
`is_system` se muestran en solo lectura.

**Jerarquía de administración:** un usuario cuyo plan le otorga `config.module.manage` puede
crear **sub-usuarios** y asignarles roles/perfiles **dentro de lo permitido por su propio plan**
(ej. un plan "familiar" puede crear perfiles "niño" que restrinjan canciones, niveles de
complejidad, o la eliminación de evaluaciones — pero no puede otorgar un módulo que su plan no
incluye).

## 7. Ejemplo concreto de uso

Escenario: plan **Familiar** (acceso a los módulos `songs` y `evaluations`, pero no a `config`).

1. `plan_modules` del plan Familiar: `songs` (requerido), `evaluations` (requerido). Sin `config`.
2. El admin del plan crea el perfil **Niño**:
   - `profile_roles`: hereda el rol `player` (jerarquía 20, solo `read` de songs/evaluations).
   - `profile_permissions` deny: `songs:delete`, `evaluations:edit` (no puede borrar canciones ni
     editar notas).
3. El admin crea un usuario `hijo` con `profile_id = Niño` y suscripción al plan Familiar
   (`selected_modules = [songs, evaluations]`).
4. Efectivo del `hijo`: `songs:read` sí, `songs:delete` no, `config:*` no (el plan no incluye el
   módulo, aunque el perfil lo pidiera).

## 8. Convenciones y reglas

- **Idioma**: nombres de tablas, columnas, claves de permiso y código en **inglés**.
- **Funciones simples**: la resolución de permisos (`permissions.util.ts`) es una función pura con
  su `.spec.ts` (regla del skill `backend-nestjs`).
- **Sin sincronización automática**: cambios de esquema vía migraciones TypeORM (`synchronize: false`).
- **Secretos**: precios y billing sensibles nunca en código; vía `.env` y proveedor de pagos.
- **Integración** con el backend: módulo `auth` devuelve `permissions` en el payload de login/me.
- **Una sola fuente de verdad en frontend**: `usePermission`/`<Can>` consultan `effectivePermissions`
  de `/auth/me`; jamás una matriz estática.

## 9. Referencias

- Backend NestJS: `ApprendeVr/Documentation/backend-nestjs.md`.
- Base de datos actual: `ApprendeVr/Documentation/database.md`.
- Skill de arquitectura backend: `.agents/skills/backend-nestjs/SKILL.md`.
- Requerimiento de implementación: `Requerimientos/1-Pending/005-roles-perfiles-planes-pago.md`.
- Implementaciones previas de referencia: sistemas de roles/permisos unificados y de gestión de
  planes de pago de proyectos desarrollados anteriormente.

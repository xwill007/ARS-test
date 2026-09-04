# Checklist de ejecución (paso a paso)

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

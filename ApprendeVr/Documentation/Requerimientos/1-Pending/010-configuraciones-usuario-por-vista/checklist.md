# Checklist de ejecución — Requerimiento 010

## Fase 1 — Esquema de base de datos

- [ ] Crear `ApprendeVr/backend/db/001-user-settings.sql` con
      `CREATE TABLE IF NOT EXISTS user_settings (user_id INT PRIMARY KEY, login_form_config JSON NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE)`.
- [ ] Montar ese script como `docker-entrypoint-initdb.d/02-user-settings.sql` en
      `ApprendeVr/backend/docker-compose.yml`, junto al dump legacy ya montado.
- [ ] Aplicar el script a mano contra el contenedor de desarrollo ya existente (el volumen de
      datos no está vacío, así que Docker no lo corre solo en el próximo arranque):
      `docker exec -i Backend-ApprendeVr mysql -uroot english_vr < ApprendeVr/backend/db/001-user-settings.sql`.
- [ ] Confirmar con una consulta directa (`DESCRIBE user_settings;`) que la tabla quedó creada con
      las columnas esperadas.

## Fase 2 — Backend: módulo `user-settings`

- [ ] Crear `entities/user-settings.entity.ts` (`userId` PK/FK a `usuarios`, `loginFormConfig`
      tipo `json` nullable, `updatedAt`).
- [ ] Escribir `user-settings.util.ts` + `.spec.ts`: mapa `view → columna` (por ahora solo
      `login-form` → `loginFormConfig`), función de validación de `view` desconocida, función de
      parseo/validación de la forma del payload de `login-form` (`position`: tupla de 3 números,
      `distanceFactor`: número dentro de un rango razonable).
- [ ] Escribir `user-settings.service.ts` + `.spec.ts` (repo mockeado): `getConfig(userId, view)`
      y `saveConfig(userId, view, config)` (upsert real: si no existe la fila del usuario, la crea).
- [ ] Escribir `dto/save-user-setting.dto.ts` con `class-validator`.
- [ ] Escribir `user-settings.controller.ts` + `.spec.ts`: `GET`/`PUT /api/user-settings/:view`,
      con `JwtAuthGuard` + `@CurrentUser()`, delegando al service.
- [ ] Crear `user-settings.module.ts` y registrarlo en `app.module.ts`.
- [ ] `npm run build` compila y `npm test` pasa sin levantar MySQL.
- [ ] `npm run test:cov`: el módulo nuevo cumple el umbral de cobertura del 80%.

## Fase 3 — Frontend: cargar y guardar la posición del login

- [ ] En `App.jsx`, al mostrar el formulario de login (`showAuth` pasa a `true`) y si hay sesión
      (`localStorage['apprendevr_auth']` con `access_token`), pedir
      `GET /api/user-settings/login-form` e inicializar `authPosition`/`authDistanceFactor` con lo
      guardado (si `null`, mantener los defaults actuales).
- [ ] En los handlers ya cableados a `UbicacionControl` (`onZoomIn`, `onZoomOut`, `onMoveUp`,
      `onMoveDown`, `onMoveLeft`, `onMoveRight`), además de actualizar el estado local, guardar el
      nuevo valor vía `PUT /api/user-settings/login-form` cuando haya sesión.
- [ ] Sin sesión iniciada, confirmar que `UbicacionControl` sigue funcionando (estado local) sin
      intentar llamar a la API.

## Fase 4 — Verificación manual end-to-end

- [ ] Con un usuario logueado: abrir el login, mover/hacer zoom, recargar la página, volver a
      abrir el login y confirmar que aparece en la posición/zoom ajustados (no el default).
- [ ] Con dos usuarios distintos (dos sesiones/login separados en el mismo navegador): confirmar
      que cada uno conserva su propio ajuste, sin pisarse.
- [ ] Confirmar en la consola del navegador que no hay errores al abrir/cerrar el formulario ni al
      mover/hacer zoom, tanto con sesión como sin ella.

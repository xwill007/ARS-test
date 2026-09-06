# Checklist de ejecución — Requerimiento 010

## Fase 1 — Esquema de base de datos

- [x] Crear `ApprendeVr/backend/db/001-user-settings.sql` con
      `CREATE TABLE IF NOT EXISTS user_settings (user_id INT PRIMARY KEY, login_form_config JSON NULL, aframe_view_config JSON NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE)`.
- [x] Montar ese script como `docker-entrypoint-initdb.d/02-user-settings.sql` en
      `ApprendeVr/backend/docker-compose.yml`, junto al dump legacy ya montado.
- [x] Aplicar el script a mano contra el contenedor de desarrollo ya existente (el volumen de
      datos no está vacío, así que Docker no lo corre solo en el próximo arranque):
      `docker exec -i Backend-ApprendeVr mysql -uroot english_vr < ApprendeVr/backend/db/001-user-settings.sql`.
- [x] Confirmar con una consulta directa (`DESCRIBE user_settings;`) que la tabla quedó creada con
      las columnas esperadas. Verificado: `user_id` (PK), `login_form_config` (json),
      `aframe_view_config` (json), `updated_at`.

## Fase 2 — Backend: módulo `user-settings`

- [x] Crear `entities/user-settings.entity.ts` (`userId` PK/FK a `usuarios`, `loginFormConfig`
      tipo `json` nullable, `updatedAt`).
- [x] Escribir `user-settings.util.ts` + `.spec.ts`: mapa `view → columna` (`login-form` →
      `loginFormConfig`, `aframe-view` → `aframeViewConfig`), función de validación de `view`
      desconocida, función de parseo/validación de la forma de cada payload (`login-form`:
      `position` tupla de 3 números + `distanceFactor` numérico en rango razonable; `aframe-view`:
      `{ video, karaoke, newSong }`, cada uno con `position` tupla de 3 números).
- [x] Escribir `user-settings.service.ts` + `.spec.ts` (repo mockeado): `getConfig(userId, view)`
      y `saveConfig(userId, view, config)` (upsert real: si no existe la fila del usuario, la crea).
- [x] Escribir `dto/save-user-setting.dto.ts` con `class-validator`.
- [x] Escribir `user-settings.controller.ts` + `.spec.ts`: `GET`/`PUT /api/user-settings/:view`,
      con `JwtAuthGuard` + `@CurrentUser()`, delegando al service.
- [x] Crear `user-settings.module.ts` y registrarlo en `app.module.ts`.
- [x] `npm run build` compila y `npm test` pasa sin levantar MySQL (62/62 tests, toda la suite).
- [x] `npm run test:cov`: el módulo nuevo cumple el umbral de cobertura del 80% (100% statements/
      branches/functions/lines en los 5 archivos de `user-settings`).

## Fase 3 — Frontend: cargar y guardar la posición del login

- [x] En `App.jsx`, al mostrar el formulario de login (`showAuth` pasa a `true`) y si hay sesión
      (`localStorage['apprendevr_auth']` con `access_token`), pedir
      `GET /api/user-settings/login-form` e inicializar `authPosition`/`authDistanceFactor` con lo
      guardado (si `null`, mantener los defaults actuales).
- [x] En los handlers ya cableados a `UbicacionControl` (`onZoomIn`, `onZoomOut`, `onMoveUp`,
      `onMoveDown`, `onMoveLeft`, `onMoveRight`), además de actualizar el estado local, guardar el
      nuevo valor vía `PUT /api/user-settings/login-form` cuando haya sesión.
- [ ] Sin sesión iniciada, confirmar que `UbicacionControl` sigue funcionando (estado local) sin
      intentar llamar a la API. No verificado todavía en navegador (solo revisado por código: la
      guarda `if (!token) return null/return;` en `getUserSetting`/`saveUserSetting` cubre el
      caso, pero falta la comprobación manual).

## Fase 4 — Frontend: control de posición en la vista A-Frame

- [x] **Rediseñado tras feedback del usuario** (ver `problems_solutions.md` #1): en vez de un
      overlay HTML global con selector, `views/A-frame/vrPositionControl.js` crea un marcador 📍
      (círculo rojo) + d-pad + botón GUARDAR por cada elemento (`#video-container`,
      `#karaoke-vr-component`, `#new-song-component`), como hijos 3D de su propia entidad — se
      mueven junto con ella.
- [x] Al iniciar la vista, si hay sesión, pedir `GET /api/user-settings/aframe-view` y aplicar la
      posición guardada de cada elemento (si existe) sobre la hardcodeada de `index.html`.
- [x] **Rediseñado tras feedback del usuario** (ver `problems_solutions.md` #2): mover con el
      d-pad solo actualiza la posición en memoria/pantalla; el registro en la base de datos
      (`PUT /api/user-settings/aframe-view` con el JSON completo `{video,karaoke,newSong}`) ocurre
      recién al pulsar el botón GUARDAR de ese widget, no en cada click de movimiento.
- [x] **Corregido tras feedback del usuario** (ver `problems_solutions.md` #3): los offsets de
      cada marcador se recalcularon para quedar siempre en la esquina superior izquierda de su
      panel (`video`: `[-8, 4.8, 0]`; `karaoke`, anclado a su video interno: `[-7.5, 7.3, -3]`;
      `newSong`: `[-1.6, 2.875, 0.05]`), en vez de offsets inconsistentes (uno centrado, otro en la
      esquina derecha).
- [ ] Sin sesión iniciada, confirmar que los marcadores siguen moviendo los elementos (sin
      persistir), sin llamadas a la API ni errores en consola. No verificado todavía en navegador
      (misma guarda por código que el punto anterior).
- [x] Importar e inicializar `vrPositionControl.js` desde `index.js` (tras el evento `loaded` de
      la escena, tal como ya hace `setupCameraControls`).
- [x] Verificado en navegador: los tres marcadores (video, karaoke, newSong) abren su propio d-pad
      independiente al click, mover actualiza la posición visualmente sin llamar a la API, y
      GUARDAR persiste solo la posición de ese elemento sin pisar las otras dos columnas del JSON.

## Fase 5 — Verificación manual end-to-end

- [x] Con un usuario logueado: abrir el login, hacer zoom (+0.10, de 1.50 a 1.60), recargar la
      página, volver a abrir el login y confirmar que aparece con el zoom/posición ya ajustados
      (probado con un valor claramente distinto al default — `[2,2,2]`/`1.50` guardado vía API — y
      confirmando que el formulario abre con exactamente ese valor, no el default `[0,1.6,1]`/`2.70`).
- [ ] Con dos usuarios distintos (dos sesiones/login separados en el mismo navegador): confirmar
      que cada uno conserva su propio ajuste, sin pisarse. No verificado todavía (solo se probó
      con un usuario).
- [x] En la vista A-Frame, con un usuario logueado: mover el video (+1 en Y con el d-pad),
      recargar y confirmar que aparece en la posición ajustada (`y: 7`, no el default `y: 6`);
      confirmado además que karaoke/newSong no se pisaron entre sí en el mismo JSON.
- [x] Confirmar en la consola del navegador que no hay errores al abrir/cerrar el formulario de
      login ni al mover/hacer zoom en ninguna de las dos vistas (con sesión). Verificado sin
      errores nuevos (el único error visto, `SecurityError` del Service Worker por el certificado
      self-signed, es preexistente y no relacionado).

Datos de prueba (`login-form` → `[2,2,2]`/`1.60`, `aframe-view` → video en `y:7`) se
restablecieron a sus valores por defecto vía API antes de cerrar la verificación.

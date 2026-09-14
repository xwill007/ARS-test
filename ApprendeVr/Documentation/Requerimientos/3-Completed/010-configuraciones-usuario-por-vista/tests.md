# Estrategia de testing — Requerimiento 010

## Estrategia

**Backend (`ApprendeVr/backend/src/user-settings/`):** sigue el patrón ya establecido por el skill
`backend-nestjs` y aplicado en `auth`/`users` — funciones puras testeadas sin base de datos, service
testeado con el repositorio de TypeORM mockeado, y DTO/controller cubiertos directamente (ver
sección "Qué SÍ hay que testear directamente" del skill). Meta: mantener el umbral de cobertura del
80% (`coverageThreshold` de Jest) también en este módulo nuevo.

**Frontend (`App.jsx`):** el formulario de login vive dentro de una escena Three.js/`@react-three/fiber`
(`<Canvas>`), la misma categoría que el Requerimiento 008 clasifica como no testeable
unitariamente de forma realista (`jsdom` no soporta WebGL). La verificación de la carga/guardado de
la posición del login es manual en navegador. Si la lógica de armar el payload o interpretar la
respuesta de la API se extrae como función pura (fuera del componente), sí se agrega su test
unitario — ver tabla.

## Casos de test

| Tipo | Caso | Estado |
|---|---|---|
| Unitario (`user-settings.util.spec.ts`) | El mapa `view → columna` resuelve `login-form`/`aframe-view` a su columna y rechaza una vista no listada. | **Verificado** |
| Unitario (`user-settings.util.spec.ts`) | Validación del payload de `login-form`: acepta `{ position: [x,y,z], distanceFactor }` válido; rechaza `position` con longitud distinta de 3, valores no numéricos, `distanceFactor` no positivo o faltante, y payload no-objeto. | **Verificado** |
| Unitario (`user-settings.util.spec.ts`) | Validación del payload de `aframe-view`: acepta `{ karaoke, newSong }` con `position` válida en cada uno; rechaza si falta alguno, si `position` no es una tupla de 3 números, o payload no-objeto. (Ajustado: la clave `video` se quitó — nunca hubo una entidad de video independiente en el DOM, ver `problems_solutions.md` #5.) | **Verificado** |
| Unitario (`user-settings.util.spec.ts`) | Validación del payload de `evaluation-panel`: acepta `{ position }` válida; rechaza `position` inválida o payload no-objeto. | **Verificado** |
| Unitario (`user-settings.service.spec.ts`, repo mockeado) | `getConfig` lanza en vista desconocida; devuelve `null` si no existe la fila o la columna está vacía; devuelve la columna pedida si existe. | **Verificado** |
| Unitario (`user-settings.service.spec.ts`, repo mockeado) | `saveConfig` lanza en vista desconocida o config inválido para la vista; crea la fila si no existía; actualiza la existente sin pisar la otra columna (`aframe_view_config` intacta al guardar `login-form`). | **Verificado** |
| Unitario (`dto/save-user-setting.dto.spec.ts`) | `class-validator` acepta un payload válido y rechaza `config` faltante, vacío (`{}`) o no-objeto. | **Verificado** |
| Unitario (`user-settings.controller.spec.ts`, service mockeado) | El controller delega en el service con `userId` (de `@CurrentUser()`) y `view` (de la ruta) correctos, tanto en `GET` como en `PUT`. | **Verificado** |
| Integración manual (curl) | `GET`/`PUT /api/user-settings/login-form` sin `Authorization` responden `401`. | **Verificado** |
| Integración manual (curl) | `GET`/`PUT /api/user-settings/<vista-inexistente>` responden `400` (`UNKNOWN_VIEW`); `PUT /api/user-settings/aframe-view` con un elemento faltante responde `400` (`INVALID_CONFIG_FOR_VIEW`). | **Verificado** |
| Manual (navegador) | Con sesión iniciada: guardar un valor distintivo (`[2,2,2]`/`1.50`) vía API, recargar, abrir el login → el formulario aparece exactamente en ese valor (no el default); ajustar zoom con el control → se persiste (confirmado con un `GET` posterior). | **Verificado** |
| Manual (navegador) | Dos sesiones de usuario distintas conservan cada una su propio ajuste guardado, sin pisarse. | Pendiente (solo se probó con un usuario) |
| Manual (navegador) | Sin sesión iniciada, `UbicacionControl` sigue moviendo el formulario (estado local) sin llamadas a la API ni errores en consola. | Pendiente (cubierto por revisión de código, no probado en navegador) |
| Manual (navegador) | Vista A-Frame, con sesión: mover `karaoke` o `newSong` con el control 📍, GUARDAR, recargar, y confirmar (`GET`) que la posición persistida es la guardada, sin pisar el otro elemento en el mismo JSON. (Corregido: la fila anterior de esta tabla decía "mover el video", pero ese widget nunca existió — ver `problems_solutions.md` #5. El `PUT` real fallaba con 400 hasta el fix.) | **Verificado** |
| Manual (navegador) | Vista A-Frame, sin sesión: el control 📍 sigue moviendo los elementos (sin persistir), sin errores en consola. | Pendiente (cubierto por revisión de código, no probado en navegador) |
| Manual (navegador) | Panel de EVALUATION (creado dinámicamente vía "EVALUATE SONG"): el marcador 📍 abre/cierra su d-pad sin mover el panel, muestra coordenadas actuales, permite ajustar el incremento por click (input numérico, default `3.0`), y GUARDAR persiste vía `PUT /api/user-settings/evaluation-panel` (200, valor recuperable con `GET` posterior). | **Verificado** |

## Fuera de alcance de testing

- Cualquier test contra la sincronización en tiempo real entre pestañas/dispositivos — no está en
  el alcance de este requerimiento (ver "No incluido" en `requerimiento.md`).
- Tests end-to-end automatizados (Playwright/Cypress) del flujo completo — se verifica a mano en
  navegador, igual que el resto de los flujos 3D de la app.

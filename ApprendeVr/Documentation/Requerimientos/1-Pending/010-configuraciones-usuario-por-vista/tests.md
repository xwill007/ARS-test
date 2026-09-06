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
| Unitario (`user-settings.util.spec.ts`) | El mapa `view → columna` resuelve `login-form` a `loginFormConfig` y rechaza una vista no listada. | Pendiente |
| Unitario (`user-settings.util.spec.ts`) | Validación del payload de `login-form`: acepta `{ position: [x,y,z], distanceFactor }` válido: rechaza `position` con longitud distinta de 3, valores no numéricos, o `distanceFactor` fuera de rango. | Pendiente |
| Unitario (`user-settings.service.spec.ts`, repo mockeado) | `getConfig` devuelve `null` si no existe la fila del usuario; devuelve la columna pedida si existe. | Pendiente |
| Unitario (`user-settings.service.spec.ts`, repo mockeado) | `saveConfig` crea la fila si no existía (primer guardado del usuario) y actualiza la misma fila si ya existía (no inserta una segunda). | Pendiente |
| Unitario (`dto/save-user-setting.dto.spec.ts`) | `class-validator` acepta un payload válido y rechaza uno inválido (tipos incorrectos, campos faltantes). | Pendiente |
| Unitario (`user-settings.controller.spec.ts`, service mockeado) | El controller delega en el service con `userId` (de `@CurrentUser()`) y `view` (de la ruta) correctos, tanto en `GET` como en `PUT`. | Pendiente |
| Integración manual | `GET`/`PUT /api/user-settings/login-form` sin `Authorization` responden `401`. | Pendiente |
| Integración manual | `GET`/`PUT /api/user-settings/<vista-inexistente>` responden `400`. | Pendiente |
| Manual (navegador) | Con sesión iniciada: mover/zoom el login, recargar, reabrir el login → aparece en la posición/zoom guardados. | Pendiente |
| Manual (navegador) | Dos sesiones de usuario distintas conservan cada una su propio ajuste guardado, sin pisarse. | Pendiente |
| Manual (navegador) | Sin sesión iniciada, `UbicacionControl` sigue moviendo el formulario (estado local) sin llamadas a la API ni errores en consola. | Pendiente |

## Fuera de alcance de testing

- Cualquier test contra la sincronización en tiempo real entre pestañas/dispositivos — no está en
  el alcance de este requerimiento (ver "No incluido" en `requerimiento.md`).
- Tests end-to-end automatizados (Playwright/Cypress) del flujo completo — se verifica a mano en
  navegador, igual que el resto de los flujos 3D de la app.

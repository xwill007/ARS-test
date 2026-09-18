# Estrategia y casos de test

## Estrategia

Sigue la regla del skill `backend-nestjs`: el nuevo validador `isValidArsSyncCursorConfig` se
testea unitariamente sin mocks (función pura de validación), igual que los demás validadores de
`user-settings.util.ts`. En frontend no hay suite de tests automatizados para las vistas A-Frame/
`mirror-fix` (ver Requerimiento 008, "estrategia de testing frontend", en `1-Pending`) — el
sub-panel "Cursor" y la propagación del tiempo de activación se verifican manualmente en el
navegador, con `mirror-fix` en modo "Doble panel" para confirmar sincronización.

## Casos — Backend (Jest, unitarios)

| Archivo | Caso | Resultado esperado |
|---|---|---|
| `user-settings.util.spec.ts` | `isValidArsSyncCursorConfig` con un objeto completo válido | `true` |
| `user-settings.util.spec.ts` | `isValidArsSyncCursorConfig` con `geometry` fuera de la lista conocida | `false` |
| `user-settings.util.spec.ts` | `isValidArsSyncCursorConfig` con `fuseTimeout` <= 0 o no numérico | `false` |
| `user-settings.util.spec.ts` | `isValidArsSyncCursorConfig` con `position` que no es un array de 3 números | `false` |
| `user-settings.util.spec.ts` | `isValidArsSyncCursorConfig` con `visible` no booleano | `false` |
| `user-settings.util.spec.ts` | `isValidArsSyncCursorConfig` con `color` no string | `false` |

## Casos — Integración manual (backend levantado + `curl`/Postman)

| Caso | Resultado esperado |
|---|---|
| `PUT /api/user-settings/ars-sync-cursor` con sesión válida y config completa | `200`, la fila queda en `user_settings` con `view_id` de `ars-sync-cursor` |
| `GET /api/user-settings/ars-sync-cursor` tras guardar | Devuelve la misma config guardada |
| `PUT /api/user-settings/ars-sync-cursor` con config inválida (ej. geometría desconocida) | `400` |
| Guardar `ars-sync-cursor` y luego leer `ars-sync-compass-position` | La config de `ars-sync-compass-position` sigue intacta (merge, no reemplazo) |

## Casos — Manual en navegador (AR-SYNC / `mirror-fix`)

| Caso | Resultado esperado |
|---|---|
| Abrir menú ⚙️ → Interface → Cursor | Se ve la fila "Cursor" debajo de "Position"; click la expande/colapsa |
| Mover steppers x/y/z | El cursor visible se desplaza en tiempo real |
| Mover stepper de escala | El cursor cambia de tamaño en tiempo real; mirar fijo un botón sigue animando el fuse correctamente sobre esa nueva base |
| Mover stepper de tiempo de activación a un valor alto (ej. 4000ms) | Hace falta mirar fijo más tiempo para activar un botón, tanto en la brújula como dentro del overlay karaoke/new-song y del overlay de video |
| Ciclar color con +/- | El cursor cambia de color en cada click, dando la vuelta al llegar al final de la paleta |
| Ciclar geometría con +/- | El cursor cambia de forma (punto/cuadro/triángulo/cruz) sin errores visuales ni z-fighting |
| Activar "ocultar cursor" | El cursor desaparece de pantalla; el dwell/click sobre botones sigue funcionando igual (verificado por progreso de color/log, no visualmente) |
| Recargar la página con el mismo usuario logueado | La configuración de cursor guardada se reaplica automáticamente |
| En `mirror-fix` con "Doble panel" activo, cambiar un control de Cursor en un panel | El cambio se refleja en el panel opuesto (si el requerimiento decide sincronizar entre paneles — confirmar alcance real en `problems_solutions.md` si difiere) |

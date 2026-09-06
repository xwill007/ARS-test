# Checklist de ejecución — Requerimiento 009

## Fase 1 — Preparación de assets

- [ ] Copiar los 3 videos de karaoke (`StandByMe_BenEKing.mp4`, `ItsMyLife_BonJovi.mp4`,
      `GangstasParadise_Coolio.mp4`) desde `A-frame/english-vr/VR/videos/karaoke/` a
      `ApprendeVr/frontend/public/videos/karaoke/`.
- [ ] Confirmar que la fuente `Ultra-msdf` de `ApprendeVr/frontend/public/fonts/Ultra-msdf/`
      cubre los glifos usados por los paneles portados (ñ, á, é, í, ó, ú).

## Fase 2 — Panel de karaoke (lista + reproductor)

- [ ] Crear `views/A-frame/components/VRKaraokeAf/VRKaraokeAf.js` portando la lógica de
      `karaoke-vr.js` (schema, construcción de la lista, controles de reproducción, raycasting
      manual para click/touch).
- [ ] Apuntar `videoList`/rutas de video a `public/videos/karaoke/`.
- [ ] Declarar la entidad `vr-karaoke-af` en `index.html` e importarla en `index.js`.
- [ ] Verificar en el navegador: la lista se ve, cada item es clickeable, y play/pause/siguiente/
      anterior funcionan sobre el video elegido.

## Fase 3 — Panel de agregar canción (new-song)

- [ ] Crear `views/A-frame/components/VRKaraokeAf/components/VRNewSongAf/VRNewSongAf.js`
      portando `new-song.js` (teclado virtual QWERTY + fila de acentos, captura de teclado
      físico en modo escritura).
- [ ] Decidir y documentar en `problems_solutions.md` la estrategia temporal de guardado (sin
      backend de canciones todavía): localStorage, estado en memoria del propio componente, u
      otra.
- [ ] Verificar que agregar una canción dispara `cancion-agregada` y que `VRKaraokeAf` refresca su
      lista sin recargar la página.

## Fase 4 — Panel de evaluación

- [ ] Crear `views/A-frame/components/VREvaluacionAf/VREvaluacionAf.js` portando
      `evaluacion-vr.js` (fondo, título, selección de nivel con botones circulares, textos de
      canción/artista).
- [ ] Reemplazar el fetch a `current_user.php` por `GET /api/users/me` (backend NestJS), leyendo
      el JWT desde `localStorage['apprendevr_auth']` y enviándolo como `Authorization: Bearer`.
- [ ] Documentar en `problems_solutions.md` qué queda mock/local para: obtener palabras/frases,
      guardar evaluación, obtener evaluaciones previas (no hay backend NestJS equivalente aún).
- [ ] Intentar la integración de Nivel 2 (Web Speech API) tal como está en el legacy; si no
      alcanza el tiempo, dejarlo anotado como pendiente en este checklist (no marcar `[x]`).
- [ ] Declarar la entidad `vr-evaluacion-af` en `index.html` e importarla en `index.js`.

## Fase 5 — Integración final y verificación manual

- [ ] Cargar la vista completa (`https://<ip>:3000/src/views/A-frame/index.html`) y confirmar que
      mundo, usuario, video local, karaoke, agregar-canción y evaluación conviven sin errores en
      consola ni conflictos de posición/controles (teclado físico entre paneles).
- [ ] Confirmar que iniciar sesión en el formulario 3D (Requerimiento 007) y luego entrar a esta
      vista muestra el usuario real en el panel de evaluación.

# Estrategia de testing — Requerimiento 009

## Estrategia

Los tres paneles que agrega este requerimiento (`VREvaluacionAf`, `VRKaraokeAf`, `VRNewSongAf`) son
componentes A-Frame (`AFRAME.registerComponent`) que manipulan directamente el DOM de una
`<a-scene>` real (WebGL) — el mismo tipo de elemento que el Requerimiento 008 (estrategia de
testing del frontend) clasifica como **no testeable unitariamente de forma realista** (igual que
los componentes React Three Fiber/Canvas): `jsdom` no soporta WebGL, y el valor de estos paneles
está en el comportamiento visual/interactivo dentro de la escena.

Por lo tanto, para este requerimiento la verificación es **manual/exploratoria en navegador**
(Chrome DevTools MCP o navegación directa), igual que se hizo para la vista A-Frame existente y
para los flujos 3D del Requerimiento 007. Si al momento de implementar ya aterrizó el runner del
Requerimiento 008, se agregan además tests unitarios para cualquier lógica que se logre extraer
como función pura (ver tabla de casos "unitarios" abajo) — pero no es un bloqueante de este
requerimiento.

## Casos de test

| Tipo | Caso | Estado |
|---|---|---|
| Manual | La vista A-Frame carga sin errores en consola con los tres paneles nuevos presentes junto a mundo/usuario/video existentes. | **Verificado** (Chrome DevTools MCP, carga limpia sin errores ni warnings) |
| Manual | El panel de karaoke muestra los 3 videos portados en la lista, y el raycast manual (click/touch sobre el canvas) detecta correctamente los elementos clickeables. | **Verificado** (lista visible con las 3 canciones; `handlePointer` detectó el click sobre el botón EVALUATE SONG) |
| Manual | Los controles del reproductor (play/pause/siguiente/anterior) cambian el video/estado esperado. | Pendiente (botones presentes y con el mismo mecanismo de click ya probado; no se verificó el efecto de cada botón sobre la reproducción real) |
| Manual | Agregar una canción desde `VRNewSongAf` dispara `cancion-agregada` y la lista del karaoke se refresca sin recargar la página, sin duplicar por archivo. | **Verificado** (canción de prueba agregada vía el componente; la lista se refrescó y reemplazó la entrada existente con el mismo archivo) |
| Manual | El teclado virtual escribe correctamente ñ/á/é/í/ó/ú y respeta mayúsculas (`CAPS`) y borrado (`BKSP`). | Pendiente (se probó la inserción de caracteres vía `_insertChar`, pero no el click sobre cada botón del teclado virtual en pantalla) |
| Manual | El teclado físico solo escribe en el campo activo del panel `new-song` cuando está en "modo escritura", sin disparar el movimiento de cámara (`vr-move-controls` con `moveType: cursor` solo usa flechas/Space, no WASD, así que en principio no hay conflicto — ver `problems_solutions.md` si esto cambia). | Pendiente |
| Manual | El panel de evaluación y el de karaoke muestran el nombre de usuario real tras iniciar sesión (Requerimiento 007), vía `GET /api/users/me`. | **Verificado** (con sesión de `prueba@gmail.com`, ambos paneles mostraron "usuario prueba (id: 31)") |
| Manual | Sin sesión iniciada, los paneles no rompen la escena (mantienen "User: Guest (id: 0)" en vez de fallar). | Pendiente |
| Manual | Los textos con ñ/acentos de los paneles se ven correctamente con la fuente `Ultra-msdf` ya presente en ApprendeVr. | **Verificado** (textos estáticos en español de `VRNewSongAf`, incluida la advertencia de derechos de autor, se ven sin glifos rotos) |
| Manual | Flujo "EVALUATE SONG" → panel de evaluación dinámico → seleccionar Nivel 1 → EVALUATE → degradación explícita ("No words found") al no existir `/api/palabras`. | **Verificado** |
| Unitario (condicionado al runner del Req. 008) | Parseo de `videoList` (`"archivo.mp4\|Artista\|Duración,..."`) a la estructura de items de la lista, si se extrae como función pura. | Pendiente / opcional |
| Unitario (condicionado al runner del Req. 008) | Cálculo de nivel seleccionado (botón 2 → Nivel 2 Pronunciación; botones 1 y 3 → Nivel 1 Vocabulario) si se extrae como función pura. | Pendiente / opcional |

## Fuera de alcance de testing

- Reconocimiento de voz real (Web Speech API) del Nivel 2 de evaluación: se verifica a mano con
  micrófono en Chrome/Edge, no es automatizable en este stack.
- Cualquier test contra un backend de canciones/evaluaciones: no existe todavía (ver "No incluido"
  en `requerimiento.md`).

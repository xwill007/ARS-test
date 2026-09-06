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
| Manual | La vista A-Frame carga sin errores en consola con los tres paneles nuevos presentes junto a mundo/usuario/video existentes. | Pendiente |
| Manual | El panel de karaoke muestra los 3 videos portados en la lista, cada item resalta al pasar el cursor y es clickeable. | Pendiente |
| Manual | Los controles del reproductor (play/pause/siguiente/anterior) cambian el video/estado esperado. | Pendiente |
| Manual | Agregar una canción desde `VRNewSongAf` (teclado virtual) dispara `cancion-agregada` y la lista del karaoke se refresca sin recargar la página. | Pendiente |
| Manual | El teclado virtual escribe correctamente ñ/á/é/í/ó/ú y respeta mayúsculas (`CAPS`) y borrado (`BKSP`). | Pendiente |
| Manual | El teclado físico solo escribe en el campo activo del panel `new-song` cuando está en "modo escritura", sin mover la cámara (flechas siguen moviendo la cámara vía `arrow-controls`, WASD queda libre — mismo patrón que el legacy). | Pendiente |
| Manual | El panel de evaluación muestra el nombre de usuario real tras iniciar sesión (Requerimiento 007) y volver a esta vista, vía `GET /api/users/me`. | Pendiente |
| Manual | Sin sesión iniciada, el panel de evaluación no rompe la escena (maneja el caso sin usuario logueado de forma explícita, no con una excepción silenciosa). | Pendiente |
| Manual | Los textos con ñ/acentos de los tres paneles se ven correctamente con la fuente `Ultra-msdf` ya presente en ApprendeVr. | Pendiente |
| Unitario (condicionado al runner del Req. 008) | Parseo de `videoList` (`"archivo.mp4\|Artista\|Duración,..."`) a la estructura de items de la lista, si se extrae como función pura. | Pendiente / opcional |
| Unitario (condicionado al runner del Req. 008) | Cálculo de nivel seleccionado (botón 2 → Nivel 2 Pronunciación; botones 1 y 3 → Nivel 1 Vocabulario) si se extrae como función pura. | Pendiente / opcional |

## Fuera de alcance de testing

- Reconocimiento de voz real (Web Speech API) del Nivel 2 de evaluación: se verifica a mano con
  micrófono en Chrome/Edge, no es automatizable en este stack.
- Cualquier test contra un backend de canciones/evaluaciones: no existe todavía (ver "No incluido"
  en `requerimiento.md`).

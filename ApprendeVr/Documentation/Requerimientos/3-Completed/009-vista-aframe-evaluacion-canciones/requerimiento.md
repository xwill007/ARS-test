# Requerimiento 009 — Portar la evaluación de pronunciación y la lista/reproductor de canciones a la vista A-Frame de ApprendeVr

## 1. Objetivo

Agregar a la vista A-Frame de ApprendeVr (`ApprendeVr/frontend/src/views/A-frame/index.html`) los
elementos 3D de evaluación de pronunciación y de lista/reproductor de canciones (karaoke) que ya
existen en el proyecto legacy `A-frame/english-vr/VR`, adaptándolos a la arquitectura de
componentes y al encarpetado por vista ya definidos en ApprendeVr, en vez de mantenerlos como una
demo aislada fuera del proyecto principal.

## 2. Antecedentes y estado actual

La vista A-Frame de ApprendeVr (`ApprendeVr/frontend/src/views/A-frame/`) hoy solo tiene el mundo
VR (`vr-world`), el usuario/cámara (`vr-user`) y un video local (`vr-local-video`) — ver
`index.html` e `index.js` de esa carpeta. Cada uno de estos componentes A-Frame vive en su propia
carpeta dentro de `views/A-frame/components/`, siguiendo el patrón de colocation por vista descrito
en el skill `componentes-frontend` (`VRWorld/VRWorldAf.js`, `VRUserAf/VRUserAf.js`,
`VRVideoAf/VRLocalVideo/VRLocalVideo.js`).

Aparte, el proyecto legacy `A-frame/english-vr/VR` (submódulo `A-frame`, carpeta `english-vr/VR`)
tiene tres componentes A-Frame registrados que sí implementan evaluación y canciones, cargados
todos juntos desde su propio `index.html`:

- `componentes/evaluacion-vr/evaluacion-vr.js` (1558 líneas): panel 3D de evaluación. Muestra
  título/artista de la canción elegida, el usuario actual, dos niveles (Nivel 1 — Vocabulario,
  Nivel 2 — Pronunciación vía Web Speech API) seleccionables con botones circulares, y guarda/lee
  el resultado contra un backend PHP propio.
- `componentes/karaoke-vr/karaoke-vr.js` (1211 líneas): panel 3D con la lista de canciones
  disponibles (`videoList` del schema, más lectura desde una tabla `canciones_vr`) y un
  reproductor con controles (play/pause/anterior/siguiente) para la canción elegida. Se refresca
  solo cuando se agrega una canción nueva (evento `cancion-agregada`).
- `componentes/new-song/new-song.js` (487 líneas): panel 3D con un teclado virtual (incluye
  ñ/á/é/í/ó/ú) para cargar una canción nueva al catálogo (título, autor, archivo, o URL de
  YouTube como alternativa), usado junto al karaoke.

Estos tres componentes dependen hoy de un backend PHP legacy propio
(`A-frame/Proyecto/backend/modelos/{usuarios,canciones,evaluaciones,palabras,frases}/*.php`), que
**no tiene equivalente en el backend NestJS de ApprendeVr** (`ApprendeVr/backend/src` solo tiene
los módulos `auth` y `users`, con login/registro y `GET /api/users/me`, ver Requerimiento 007). En
particular, `evaluacion-vr.js` llama a `current_user.php` (con cookie de sesión PHP),
`obtener_frases.php` / `obtener_palabras.php`, `guardar_evaluacion.php` y
`obtener_evaluaciones.php`.

Los videos de karaoke usados por la demo legacy están en
`A-frame/english-vr/VR/videos/karaoke/` (`StandByMe_BenEKing.mp4`, `ItsMyLife_BonJovi.mp4`,
`GangstasParadise_Coolio.mp4`); ApprendeVr hoy solo sirve `gangstas.mp4` desde
`ApprendeVr/frontend/public/videos/`. La fuente MSDF con soporte de ñ/acentos que usa el proyecto
legacy (`src/fonts.js`, carga `Arial-msdf.json`) ya tiene un equivalente en ApprendeVr
(`public/fonts/Ultra-msdf/`), usado en el `index.html` actual de la vista A-Frame.

## 3. Historias de usuario

- Como estudiante, quiero ver dentro de la escena VR de ApprendeVr un panel de evaluación de
  pronunciación, para practicar y ver mi progreso sin salir del entorno inmersivo.
- Como estudiante, quiero que el panel de evaluación muestre mi nombre de usuario real (el de mi
  cuenta ApprendeVr), para confirmar que estoy practicando bajo mi propia sesión.
- Como estudiante, quiero ver dentro de la escena VR una lista de las canciones disponibles, para
  elegir con cuál quiero practicar.
- Como estudiante, quiero reproducir y controlar (reproducir, pausar, siguiente, anterior) la
  canción elegida sin salir de la escena VR, para seguir el karaoke mientras practico.
- Como estudiante, quiero agregar una canción nueva al catálogo desde un panel dentro de la
  escena VR, para ampliar el material disponible sin salir de la experiencia inmersiva.

## 4. Alcance

### Incluido

- Portar los tres componentes A-Frame (`evaluacion-vr`, `karaoke-vr`, `new-song`) desde
  `A-frame/english-vr/VR/componentes/` hacia `ApprendeVr/frontend/src/views/A-frame/components/`,
  cada uno en su propia carpeta, siguiendo el mismo patrón de colocation ya usado por
  `VRWorld`/`VRUserAf`/`VRVideoAf` en esa vista.
- Integrar los tres paneles en `ApprendeVr/frontend/src/views/A-frame/index.html` e `index.js`
  (declaración de las entidades A-Frame + import de los scripts), conservando el comportamiento
  visual e interactivo original: paneles de fondo, textos, botones circulares de nivel, teclado
  virtual (QWERTY + fila de acentos), controles de reproducción, y el refresco de la lista al
  agregar una canción.
- Copiar los videos de karaoke usados por la demo legacy
  (`A-frame/english-vr/VR/videos/karaoke/*.mp4`) a
  `ApprendeVr/frontend/public/videos/karaoke/`, y ajustar el `videoList` del panel de karaoke para
  apuntar a esos archivos.
- Reutilizar la fuente MSDF ya presente en ApprendeVr (`public/fonts/Ultra-msdf/`) para los
  textos de los paneles nuevos, en vez de traer la fuente MSDF del proyecto legacy.
- Adaptar la obtención del usuario actual en el panel de evaluación para usar el backend NestJS
  real de ApprendeVr (`GET /api/users/me`, con el JWT que `App.jsx` ya guarda en
  `localStorage['apprendevr_auth']` al hacer login — ver Requerimiento 007), en vez del endpoint
  PHP legacy `current_user.php`.

### No incluido

- Persistencia real de canciones nuevas o de resultados de evaluación en el backend NestJS de
  ApprendeVr: hoy no existen módulos `canciones`, `evaluaciones`, `palabras` ni `frases` en
  `ApprendeVr/backend/src` (solo `auth` y `users`). Mientras no exista ese backend, el panel de
  evaluación y el de "agregar canción" quedan con almacenamiento local (`localStorage`) o
  deshabilitados en la parte de guardar/leer del servidor — el detalle de esta estrategia temporal
  se define al iniciar el desarrollo y se documenta en `problems_solutions.md`. Crear esos módulos
  de backend (con sus tablas, ya presentes en el dump `english-vr/VR` / `Proyecto/BaseDatos`)
  queda para un requerimiento aparte. **Actualización:** la lectura de `palabras`/`frases` (no
  la de canciones/evaluaciones) se implementó dentro de este mismo requerimiento — ver
  `problems_solutions.md` #7 (`src/songs/`, `src/words/`, `src/phrases/`).
- Nivel 2 de pronunciación vía Web Speech API: se porta la UI y el flujo de selección de nivel,
  pero la integración real con reconocimiento de voz del navegador se prueba y ajusta como parte
  de este mismo requerimiento solo si el tiempo lo permite; si no, queda anotada como pendiente en
  `checklist.md`.
- Cualquier cambio a la demo legacy (`A-frame/english-vr/VR`) — se usa solo como referencia de
  origen, no se modifica.

## 5. Diseño técnico

**Opciones consideradas:**

1. **Copiar los tres archivos `.js` tal cual** dentro de `views/A-frame/components/` sin
   reestructurar. Rápido, pero no respeta la colocation por componente (cada uno mezclaría
   escena, UI y lógica en un solo archivo gigante, sin carpeta propia) y arrastra las llamadas al
   backend PHP legacy tal cual.
2. **Portar cada componente a su propia carpeta** dentro de `views/A-frame/components/`,
   conservando el registro de componente A-Frame (`AFRAME.registerComponent`) tal como ya hace el
   resto de la vista (no son componentes React), pero separando en archivos cuando el tamaño lo
   justifique, y reemplazando las llamadas a PHP legacy por las que sí existen en el backend
   NestJS actual (`/api/users/me`) o por almacenamiento local donde no hay endpoint todavía.
   **Elegida**: mantiene el mismo patrón ya usado por `VRWorldAf`/`VRUserAf`/`VRVideoAf`, no
   introduce una arquitectura nueva (React) para elementos que son y siguen siendo entidades
   A-Frame declarativas, y dEja explícito qué queda con datos "mock"/locales hasta que exista el
   backend correspondiente.
3. **Reescribir los tres paneles como componentes React** montados vía `<Html>` de `@react-three/drei`
   (como ya hace `LoginRegisterForm` en la escena Three.js de `App.jsx`, ver Requerimiento 007).
   Descartada para este requerimiento: la vista A-Frame no usa React/Three.js — es una escena
   A-Frame pura cargada por su propio `index.html`/`index.js` — introducir React ahí sería un
   cambio de arquitectura mayor no pedido.

**Decisión:** opción 2. Estructura de carpetas dentro de la vista:

```
views/A-frame/components/
├── VREvaluacionAf/
│   └── VREvaluacionAf.js       # puerto de evaluacion-vr.js
├── VRKaraokeAf/
│   ├── VRKaraokeAf.js          # puerto de karaoke-vr.js (lista + reproductor)
│   └── components/
│       └── VRNewSongAf/
│           └── VRNewSongAf.js  # puerto de new-song.js (exclusivo del karaoke, anidado)
```

`VRNewSongAf` se anida dentro de `VRKaraokeAf/components/` porque solo se usa junto al karaoke
(dispara el evento `cancion-agregada` que `VRKaraokeAf` escucha) — no es un elemento reusable en
otra vista.

Cada componente registra su propio `AFRAME.registerComponent('vr-evaluacion-af', …)` /
`'vr-karaoke-af'` / `'vr-new-song-af'` (nombres alineados con la convención `vr-world`, `vr-user`,
`vr-local-video` ya usada en la vista), y se importa desde
`views/A-frame/index.js` igual que los componentes existentes.

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `ApprendeVr/frontend/src/views/A-frame/index.html` | Agregar las entidades `<a-entity vr-karaoke-af="...">` y `<a-entity vr-evaluacion-af="...">` (que a su vez incluye `vr-new-song-af`) a la escena. |
| `ApprendeVr/frontend/src/views/A-frame/index.js` | Importar los tres componentes nuevos junto a los ya existentes. |
| `ApprendeVr/frontend/src/views/A-frame/components/VREvaluacionAf/VREvaluacionAf.js` (nuevo) | Puerto de `A-frame/english-vr/VR/componentes/evaluacion-vr/evaluacion-vr.js`, reemplazando el fetch a `current_user.php` por `GET /api/users/me` con el JWT de `localStorage['apprendevr_auth']`, y documentando qué queda mock (guardar/obtener evaluación, palabras/frases). |
| `ApprendeVr/frontend/src/views/A-frame/components/VRKaraokeAf/VRKaraokeAf.js` (nuevo) | Puerto de `A-frame/english-vr/VR/componentes/karaoke-vr/karaoke-vr.js` (lista + reproductor), con `videoList` apuntando a `public/videos/karaoke/`. |
| `ApprendeVr/frontend/src/views/A-frame/components/VRKaraokeAf/components/VRNewSongAf/VRNewSongAf.js` (nuevo) | Puerto de `A-frame/english-vr/VR/componentes/new-song/new-song.js` (panel + teclado virtual). |
| `ApprendeVr/frontend/public/videos/karaoke/*.mp4` (nuevos) | Copia de los 3 videos de karaoke desde `A-frame/english-vr/VR/videos/karaoke/`. |

## 7. Criterios de aceptación

- [ ] La vista `ApprendeVr/frontend/src/views/A-frame/index.html` carga, además del mundo/usuario/video
      ya existentes, el panel de evaluación, el panel de lista/reproductor de canciones y el panel
      de agregar canción, sin romper lo que ya funciona en la vista.
- [ ] Los tres paneles nuevos conservan el comportamiento visual e interactivo de la versión legacy:
      selección de nivel en evaluación, controles de reproducción (play/pause/siguiente/anterior)
      en el karaoke, y el teclado virtual (QWERTY + ñ/á/é/í/ó/ú) para agregar canciones.
- [ ] Cada panel vive en su propia carpeta dentro de `views/A-frame/components/`, siguiendo el
      patrón de colocation por vista (`VREvaluacionAf/`, `VRKaraokeAf/`,
      `VRKaraokeAf/components/VRNewSongAf/`), sin lógica de un panel mezclada en el archivo de otro.
- [ ] El panel de evaluación muestra el nombre de usuario real obtenido de `GET /api/users/me`
      (backend NestJS, con el JWT de la sesión ApprendeVr) en vez del endpoint PHP legacy.
- [ ] Los tres videos de karaoke portados están disponibles en `public/videos/karaoke/` y
      aparecen listados y reproducibles en el panel de karaoke.
- [ ] Los textos de los nuevos paneles usan la fuente MSDF ya presente en ApprendeVr
      (`Ultra-msdf`), mostrando correctamente ñ/acentos.
- [ ] Queda documentado en `problems_solutions.md` qué partes de evaluación/canciones dependen de
      un backend que aún no existe (guardar/leer evaluación, catálogo real de canciones) y cómo
      quedaron resueltas temporalmente (mock/local) para este requerimiento.

## 8. Referencias

- Vista A-Frame actual de ApprendeVr: `ApprendeVr/frontend/src/views/A-frame/`.
- Componentes legacy de origen: `A-frame/english-vr/VR/componentes/{evaluacion-vr,karaoke-vr,new-song}/`.
- Backend PHP legacy (fuera de alcance, solo referencia): `A-frame/Proyecto/backend/modelos/{usuarios,canciones,evaluaciones,palabras,frases}/`.
- Requerimiento 003 legacy (contexto de `new-song`): `A-frame/english-vr/VR/Requerimientos/003-agregar-nuevas-canciones/`.
- Requerimiento 007 (login/registro 3D y sesión JWT en `localStorage`): `ApprendeVr/Documentation/Requerimientos/1-Pending/007-formulario-3d-login-registro/`.
- Skill `componentes-frontend` (arquitectura de componentes de ApprendeVr/frontend).

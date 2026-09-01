# Integración A-Frame → ApprendeVr (ARS-test)

## 1. Objetivo

Definir cómo el flujo de trabajo "prototipar en A-Frame → implementar en ApprendeVr" se convierte en un
proceso repetible, en vez de una migración manual ad-hoc cada vez. Este documento describe el estado actual
de ambos proyectos, el patrón de migración que el propio código ya insinúa, y los pasos concretos a seguir
para llevar una maqueta de `xwill007/A-frame` a producción dentro de `ARS-test/ApprendeVr`.

## 2. Los dos proyectos

| | `ARS-test` (este repo) | `A-frame` (github.com/xwill007/A-frame) |
|---|---|---|
| Rol | Aplicación final: "Aprende inglés con RV/RA" | Banco de pruebas / maquetado rápido de escenas VR |
| Motor 3D | `@react-three/fiber` (React + three.js) + `drei` | A-Frame (`AFRAME.registerComponent`, custom elements `<a-*>`) |
| UI / estado | React, Context API (`VRLanguageContext`, `VRThemeContext`) | DOM + `document.addEventListener`, sin framework |
| i18n | `i18next`, textos en `src/locales/{es,en,br}.json` | Texto embebido en el JS de cada componente (ej. `"SONGS LIST"`, `"EVALUATION"`) |
| Backend | No tiene (solo frontend Vite) | PHP + MySQLi (`Proyecto/backend`), BD `english_vr` |
| Sesión de usuario | No implementada aún | `localStorage.user_id` + endpoint `current_user.php` (sesión PHP) |

Ambos motores (A-Frame y react-three-fiber) están construidos sobre three.js, pero **no son compatibles a nivel
de árbol de escena**: A-Frame gestiona su propio DOM de entidades (`<a-scene>`, `<a-entity>`) y su ciclo de vida
de componentes; R3F reconcilia three.js directamente desde React. No se puede montar un `<a-scene>` dentro de
un `<Canvas>` de R3F. Por eso la integración es de **puerto/traducción de componentes**, no de embebido directo.

## 3. Qué existe hoy en este repo (verificado en código)

- `ApprendeVr/frontend/src/views/A-frame/` ya contiene una copia de componentes A-Frame "puros"
  (`VRWorldAf.js`, `VRUserAf.js`, `VRFloorAf.js`, `VRSkyAf.js`, `VRVideoAf/...`) servida como página estática
  (`views/A-frame/index.html`) — **no está integrada en el árbol de React**, es una demo standalone.
- `App.jsx` arma una URL absoluta (`aframeUrl = .../src/views/A-frame/index.html`) y la abre con
  `window.location.href` desde un `VRButton` (`components/VRViews/VRButton.jsx:40-41`). Es decir, hoy la
  "conexión" entre ambos mundos es un **enlace de salida de página completa**, sin estado compartido.
- Ya existe, aunque incompleto, el patrón de **puerto 1:1** que hay que repetir: `VRWorldAf.js` (A-Frame) tiene
  su equivalente `VRWorld.jsx` (R3F) en `components/VRWorld/`; `VRFloorAf.js` ↔ `VRFloor.jsx`; el cielo de
  A-Frame (`VRSkyAf.js`) se resuelve del lado React con `<Sky>` de `drei` en vez de un componente propio.

## 4. Qué trae el repo A-Frame (banco de pruebas)

- `english-vr/VR/componentes/karaoke-vr/` — reproductor de canciones con letra sincronizada (video local +
  overlay de lista de canciones en 3D).
- `english-vr/VR/componentes/evaluacion-vr/` — panel de evaluación de dificultad/pronunciación (1-3), guarda
  resultados vía `fetch` a PHP.
- `Proyecto/backend/modelos/{usuarios,canciones,evaluaciones,palabras}/*.php` — endpoints REST simples sobre
  MySQLi.
- `Proyecto/BaseDatos/english_vr.sql` — esquema: `usuarios`, `canciones_vr`, `frases_vr`, `palabras_vr`,
  `evaluaciones_vr`.
- `Proyecto/documentacion/*.md` — estos documentos mencionan FastAPI como plan original de backend, pero el
  código real implementado es PHP/MySQLi. Tomar el **código**, no el `documentacion.md`, como fuente de verdad.

### 4.1 Actualización — merge de `8-evaluacion-pronunciacion` a `main` (01-sep-2026)

El repo A-Frame local se sincronizó con `origin/main` (fast-forward `9108d8f..8492e4d`) e incorporó el trabajo
de evaluación de pronunciación. Esto amplía lo que hay que portar:

- **`evaluacion-vr.js` ahora tiene 3 niveles** (antes solo existía el Nivel 1):
  1. **Nivel 1 — Vocabulario**: quiz de opción múltiple inglés→español (el que ya estaba documentado).
  2. **Nivel 2 — Pronunciación de palabras**: usa la **Web Speech API** del navegador
     (`window.SpeechRecognition` / `webkitSpeechRecognition`) para que el usuario pronuncie en voz alta cada
     palabra de `palabras_vr.ing_palabra` y compara el resultado reconocido contra la palabra esperada.
  3. **Nivel 3 — Pronunciación de frases**: igual que el Nivel 2 pero con frases completas de
     `frases_vr.ingles_frase`, calificadas con **distancia de Levenshtein** (similitud 0-100 en vez de
     coincidencia exacta).
  - Requiere navegador con soporte de Web Speech API (Chrome/Edge; no todos los navegadores/Safari lo
    soportan igual) — dato importante para el puerto a React, ya que R3F/Canvas no cambia esto pero sí hay
    que decidir un *fallback* si no está disponible.
- **Nuevo endpoint `Proyecto/backend/modelos/frases/obtener_frases.php`**, espejo de `obtener_palabras.php`
  pero sobre `frases_vr`, para alimentar el Nivel 3.
- **`registrar_canciones.php` ahora también lista canciones** (soporta GET además de POST), pensado para
  reemplazar el `videoList` hardcodeado de `karaoke-vr.js` — pero, según el propio `Requerimientos/003`, esa
  conexión **todavía no está hecha** en el frontend A-Frame: `karaoke-vr.js` sigue leyendo un string estático.
- **Nuevo componente `componentes/new-song/new-song.js`**: panel 3D con teclado virtual propio (A-Frame no
  tiene input nativo) para cargar título/autor/archivo/URL de YouTube de una canción nueva. Trae su propia
  fuente MSDF (`fonts/Arial-msdf.*`) para soportar tildes/ñ, algo a tener en cuenta si se porta a R3F (`drei`
  `<Text>` también soporta fuentes custom vía `font=`).
- **`english-vr/VR/scripts/server.js` + `start_dev.bat`**: servidor Node HTTPS de desarrollo *del propio repo
  A-Frame* (sirve estáticos + hace de proxy de las rutas `.php` hacia Apache/XAMPP, y soporta `Range` para
  video). Es infraestructura específica para correr la demo A-Frame en Windows con XAMPP; no reemplaza al
  backend PHP y no aplica directamente a `ARS-test` (que ya tiene su propio flujo con `start-mobile.sh` +
  Vite), pero es una referencia útil si en algún punto se necesita servir video con soporte `Range` desde
  Nest.
- **`Requerimientos/001, 002, 003`** (carpeta nueva `english-vr/VR/Requerimientos/`): specs en texto plano de
  los niveles 2/3 y del flujo para agregar canciones nuevas — buena fuente para escribir los DTOs y reglas de
  negocio de `EvaluationsModule`/`SongsModule` en Nest sin tener que releer el JS línea por línea.

## 5. Flujo de trabajo recomendado (prototipo → producción)

1. **Prototipar en A-Frame** (repo `A-frame`): iterar rápido con `AFRAME.registerComponent`, HTML declarativo,
   sin preocuparse por React todavía.
2. **Separar lógica de presentación**: dentro del componente A-Frame, identificar qué es lógica pura (cálculo
   de posiciones, parseo de `videoList`, reglas de puntaje) vs. qué es creación de entidades DOM
   (`document.createElement('a-plane')`, etc.). La lógica pura se puede copiar casi literal a React; la parte
   de entidades se reescribe como JSX/R3F.
3. **Recrear la escena en React + R3F** siguiendo el mapeo de la sección 6, reutilizando lo que ya exista en
   `components/VRWorld`, `components/VRUser`, `components/VRViews`.
4. **Reemplazar texto embebido por `i18next`**: cualquier string visible (`"SONGS LIST"`, `"EVALUATION"`,
   `"1:EASY, 2:NORMAL, 3:HARD"`) debe salir como clave nueva en `src/locales/es.json` / `en.json` / `br.json`,
   según la regla del proyecto ("Variables para texto en locales deben crearse en español").
5. **Conectar datos**: decidir la estrategia de backend (sección 7) antes de portar `karaoke-vr.js` /
   `evaluacion-vr.js`, ya que ambos dependen de los endpoints PHP.
6. **Sesión de usuario**: hoy A-Frame usa `localStorage.user_id` + `current_user.php`. En React esto debe vivir
   en un `VRUserContext` (mismo patrón que `VRLanguageContext`/`VRThemeContext`) en vez de tocar
   `localStorage` desde cada componente.
7. **Retirar la demo standalone** una vez portado un módulo: eliminar el enlace `VRButton → aframeUrl` para esa
   feature específica (o dejarlo solo mientras el equivalente React no esté completo).
8. **Tests**: agregar pruebas unitarias para la lógica pura extraída en el paso 2, conforme a
   `Documentation/project.rules`.

## 6. Mapeo de componentes (A-Frame → React/R3F)

| A-Frame (`views/A-frame` o repo `A-frame`) | Equivalente React (`components/`) | Estado |
|---|---|---|
| `VRWorldAf.js` | `VRWorld/VRWorld.jsx` | Ya existe |
| `VRFloorAf.js` | `VRWorld/VRFloor.jsx` | Ya existe |
| `VRSkyAf.js` | `<Sky>` de `@react-three/drei` (usado en `App.jsx`) | Ya existe (vía librería) |
| `VRUserAf.js`, `VRCameraAf.js`, `VRMoveControlsAf.js` | `VRUser/VRUser.jsx`, `VRCamera.jsx`, `VRMoveControls.jsx` | Ya existe |
| `VRCursor.js` (A-Frame) | `VRUser/VRCursor.jsx` | Ya existe |
| `VRVideoAf/VRLocalVideo/VRLocalVideo.js` | `VRViews/VRVideoLocal.jsx` | Ya existe |
| `VRYoutubeVideo/*` (repo A-Frame) | `VRViews/VRYoutubePlayer.jsx` | Ya existe |
| `karaoke-vr.js` (repo A-Frame) | *(pendiente)* — candidato: `components/VRViews/VRKaraoke.jsx` | **Por portar** |
| `evaluacion-vr.js` (repo A-Frame) | *(pendiente)* — candidato: `components/VRViews/VREvaluation.jsx` | **Por portar** |
| `componentes/new-song/new-song.js` (repo A-Frame) | *(pendiente)* — candidato: `components/VRViews/VRNewSong.jsx` | **Por portar** |

> Actualizado tras el merge de la rama `8-evaluacion-pronunciacion` a `main` del repo A-Frame (ver detalle en
> la sección 4.1). `evaluacion-vr.js` y `karaoke-vr.js` cambiaron sustancialmente; el mapeo de arriba sigue
> siendo válido a nivel de componente, pero su alcance interno creció (ver 4.1).

## 7. Backend: decisión tomada — NestJS

El repo `A-frame` trae su propio backend PHP + MySQL (`Proyecto/backend`, credenciales locales tipo XAMPP en
`connDB.php`). `ARS-test` **no tiene backend hoy**, solo frontend Vite. Decisión: **reimplementar los mismos
endpoints en NestJS**, reutilizando el esquema de `english_vr.sql`, en vez de reusar el PHP tal cual o migrar a
un BaaS.

### 7.1 Estructura propuesta

Nuevo paquete hermano de `frontend`, por ejemplo `ApprendeVr/backend/`, con Nest CLI estándar:

```
ApprendeVr/backend/
  src/
    users/          # login, registro, current user  (equivalente a usuarios/*.php)
    songs/          # canciones_vr                    (canciones/*.php, ahora también GET=listar)
    words/          # palabras_vr — Nivel 1/2         (palabras/*.php)
    phrases/        # frases_vr — Nivel 3             (frases/obtener_frases.php, nuevo)
    evaluations/    # evaluaciones_vr — niveles 1/2/3  (evaluaciones/*.php)
    app.module.ts
    main.ts
  .env               # DB_HOST, DB_USER, DB_PASS, DB_NAME, JWT_SECRET
```

Cada carpeta de dominio sigue el patrón Nest de `*.module.ts` + `*.controller.ts` + `*.service.ts` + DTOs con
`class-validator`, en vez de los `if`/`isset` sueltos que hoy validan el body en PHP.

### 7.2 Acceso a datos

Usar **TypeORM** con entidades que mapeen 1:1 el esquema ya validado en `english_vr.sql`
(`usuarios`, `canciones_vr`, `frases_vr`, `palabras_vr`, `evaluaciones_vr`), para no tener que migrar datos ni
reescribir el modelo. `@nestjs/config` + `.env` para las credenciales (nunca hardcodeadas, a diferencia de
`connDB.php`), conforme a `project.rules`.

### 7.3 Sesión / auth

El PHP actual usa sesión de servidor (`$_SESSION['user_id']`) + `current_user.php`. En Nest, reemplazar por
JWT (`@nestjs/jwt` + `passport-jwt`): `login` devuelve un token, el frontend lo guarda (vía el futuro
`VRUserContext`, no `localStorage` suelto) y lo manda como `Authorization: Bearer`. Esto también evita cookies
de sesión cross-origin entre el dev server de Vite y el de Nest.

### 7.4 CORS y dev server

Habilitar CORS en Nest (`app.enableCors(...)`) restringido al origin de Vite (`VITE_FRONT_IP:VITE_PORT`, mismas
variables que ya usa `start-mobile.sh`), o usar el proxy de Vite (`server.proxy` en `vite.config.js`) hacia el
puerto del backend Nest para evitar CORS en desarrollo.

## 8. Endpoints de referencia (contrato PHP a preservar como rutas Nest)

| Endpoint PHP (repo A-Frame) | Método | Payload | Respuesta | Ruta Nest equivalente |
|---|---|---|---|---|
| `usuarios/login_usuario.php` | POST | `{email, password}` | `{status, user_id}` | `POST /users/login` → `{access_token, user_id}` |
| `usuarios/registrar_usuario.php` | POST | datos de registro | `{status, message}` | `POST /users/register` |
| `usuarios/current_user.php` | GET | (sesión) | `{status, user: {id, nombre}}` | `GET /users/me` (guard JWT) |
| `canciones/registrar_canciones.php` | POST/GET | datos de canción (POST) o ninguno (GET=listar) | `{status, id_cancion}` / lista de canciones | `POST /songs`, `GET /songs` |
| `palabras/obtener_palabras.php` | GET/POST | `{songTitle, author}` o `{archivo}` | lista de palabras es/en (Nivel 1 y 2) | `GET /words?songTitle=&author=` |
| `frases/obtener_frases.php` **(nuevo)** | GET/POST | `{songTitle, author}` o `{archivo}` | lista de frases es/en, con `tiempo_frase` (Nivel 3) | `GET /phrases?songTitle=&author=` |
| `evaluaciones/guardar_evaluacion.php` | POST | `{id_cancion, id_usuario, total, nota_evaluacion, terminado}` | `{status, id_evaluacion}` | `POST /evaluations` |
| `evaluaciones/obtener_evaluaciones.php` | GET | filtros por usuario/canción | historial de evaluaciones | `GET /evaluations?userId=&songId=` |

## 9. Próximos pasos concretos

1. Generar el proyecto Nest en `ApprendeVr/backend/` (`nest new backend`) y conectar TypeORM a `english_vr`.
2. Implementar `UsersModule` (login con JWT, registro, `/users/me`) — primero, porque karaoke y evaluación
   dependen de tener un usuario identificado.
3. Implementar `SongsModule`, `WordsModule` y `PhrasesModule` (lectura de `canciones_vr`, `palabras_vr`,
   `frases_vr`).
4. Implementar `EvaluationsModule` (`evaluaciones_vr`), cubriendo los 3 niveles (guardar `nivel` además de
   `total`/`nota_evaluacion`/`terminado` — ver `migracion_nivel_evaluaciones_vr.sql` del repo A-Frame).
5. Portar `karaoke-vr.js` → `VRKaraoke.jsx`, reusando `VRVideoLocal.jsx` para el video y agregando el listado
   de canciones como UI de R3F/HTML overlay, consumiendo `SongsModule` (ya no un `videoList` hardcodeado).
6. Portar `evaluacion-vr.js` → `VREvaluation.jsx` con sus 3 niveles, consumiendo `WordsModule`/`PhrasesModule`/
   `EvaluationsModule`. Decidir el manejo de Web Speech API en React (mismo API de navegador, pero definir
   fallback para navegadores sin soporte — ej. Safari/iOS).
7. Portar `new-song.js` → `VRNewSong.jsx` (puede reusar inputs HTML normales en vez del teclado virtual 3D,
   ya que en React sí hay overlays DOM disponibles), consumiendo `SongsModule`.
8. Extraer strings a `src/locales/*.json`.
9. Crear `VRUserContext` en el frontend para sesión (JWT en memoria/storage seguro), reemplazando el uso
   directo de `localStorage` disperso en los componentes A-Frame.

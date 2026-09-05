# Requerimiento 006 — Control por voz e interacción por componentes

## 1. Objetivo

Crear un **sistema de control por voz unificado y reutilizable** en `ApprendeVr/frontend` que
permita a cada componente declarar **palabras clave (comandos)** y **zonas activables por apuntado
(raycaster/gaze)**, y que interactúe con los demás componentes de la aplicación de forma
desacoplada.

Primer foco (orden definido por el usuario):

1. **Formulario de registro y login** — dictado de campos (inputs genéricos).
2. **Controles del reproductor de video** — play, pause, seek, volumen, mute.
3. **Evaluación de pronunciación** — palabras y frases, con niveles de evaluación.

El sistema debe poder elegir **motor de reconocimiento por componente** según la exactitud
necesaria: el **nativo del navegador (Web Speech API)** para interacciones rápidas, o un
**servicio en la nube (via backend)** para los casos que requieren más precisión (ej. evaluación
avanzada de pronunciación).

## 2. Antecedentes y estado actual

### 2.1 Lo que ya existe (fragmentado y sin unificar)

| Pieza | Archivo | Qué hace hoy |
|---|---|---|
| Control de voz React | `src/views/ARs/ARScomponents/VoiceController.jsx` | Usa Web Speech API; recibe `commands` (`play`, `stop`, `pausa`...) y un callback `onCommand`. |
| Control de voz A-Frame | `src/views/ARs/ARScomponents/overlays/VRVoiceController.jsx` | Registra los componentes A-Frame `vr-voice-control`, `vr-mic-gaze-control`, `vr-mic-icon`; usa Web Speech API con `commands` por keyword y `targetEntityId`/`targetComponent`. |
| Reproductores | `src/components/VRViews/VRVideoLocal.jsx`, `VRYoutubePlayer.jsx`, `VideoBox.jsx` | Reproductor local y YouTube con botón play/pause propio. |
| Controles A-Frame | `src/views/A-frame/components/VRVideoAf/VRYoutubeVideo/VideoControls.js` (`video-controls`), `VRLocalVideo.js` | Botones play/pause dentro de la escena A-Frame. |
| Cursor/raycaster (R3F) | `src/components/VRUser/VRCursor.jsx`, `VRPointer.jsx` | Raycast desde la cámara; `VRCursor` mueve un torus de apuntado. |
| Cursor/raycaster (A-Frame) | `src/views/A-frame/components/VRUserAf/VRCursor.js` | Cursor A-Frame. |

**Diagnóstico:** hay dos implementaciones de voz paralelas (React y A-Frame) que no comparten
lógica ni registro de comandos, cada una con su propio `SpeechRecognition`. No existe un mecanismo
genérico para que un componente declare "escucho estas palabras" y "soy activable por apuntado".

### 2.2 Lo que NO existe

- **Formulario de registro/login en el frontend** — viene de otro requerimiento (autenticación, req
  004/005). Este requerimiento **no lo crea**; solo define el mecanismo de voz para **llenar inputs
  genéricos**.
- **Evaluación de pronunciación** — no hay nada hoy.
- **Adapter a motor en la nube** — solo Web Speech API.
- **Registro centralizado de comandos por componente** — cada pieza hace su propio matching.

### 2.3 Decisiones confirmadas con el usuario

- **Motor de voz**: usar **ambos** (nativo y nube) según la exactitud requerida; cada componente
  con el que se interactúa define cuál usa.
- **Formulario login/register**: viene de otro requerimiento; acá solo la capa de voz para inputs.
- **Evaluación de pronunciación**: **dos niveles** (básico y avanzado), seleccionables por nivel.
- **Alcance**: un solo requerimiento con **3 fases**.

## 3. Historias de usuario

- **HU-1 (voz core):** Como usuario de la app, quiero que cualquier control responda a comandos de
  voz o a que lo mire y lo señale, para poder operar sin teclado ni controles físicos.
- **HU-2 (registro/login):** Como estudiante, quiero dictar con la voz cada campo del formulario de
  registro y login (nombre, email, contraseña) y navegar entre campos diciendo "siguiente" o
  "enviar", para no tener que teclearlos.
- **HU-3 (video):** Como estudiante, quiero controlar el reproductor de video con la voz
  ("reproducir", "pausar", "silenciar", "subir volumen"), para seguir la canción o tutorial sin
  quitar las manos de la experiencia.
- **HU-4 (evaluación básica):** Como estudiante, quiero que la app detecte si pronuncié la palabra/frase esperada, para saber si la dije o no.
- **HU-5 (evaluación avanzada):** Como estudiante, quiero recibir una puntuación de qué tan bien pronuncié la palabra o frase, para mejorar mi pronunciación de forma medible.
- **HU-6 (selección de motor):** Como responsable del sistema, quiero poder definir por módulo si la voz se procesa con el motor del navegador o con un servicio más preciso, para equilibrar velocidad y exactitud según la actividad.

## 4. Alcance

### Incluido

- **Núcleo de voz unificado** (`useVoiceControl` / servicio) con:
  - registro de comandos por componente (diccionario `keyword → acción`),
  - activación por **palabra clave** y por **apuntado (raycaster/gaze)**,
  - **adapters intercambiables**: `browser` (Web Speech API) y `cloud` (via backend),
  - feedback visual/auditivo de escucha y resultado.
- **Fase 1 — Formularios (inputs genéricos)**: dictado por campo (nombre, email, contraseña, etc.) sobre cualquier `<input>`/`<textarea>`, con comando para "siguiente campo"/"enviar". Listo para onectarse al formulario de login/register cuando exista.
- **Fase 2 — Reproductor de video**: comandos `play`, `pause`, `detener`, `siguiente`, `anterior`,
  `subir/bajar volumen`, `silenciar`, `avanzar/retroceder N segundos` sobre `VRVideoLocal.jsx` / `VRYoutubePlayer.jsx` y sus controles A-Frame.
- **Fase 3 — Evaluación de pronunciación**: comparar el `transcript` del usuario contra la palabra/frase esperada:
  - **Nivel básico**: coincidencia simple (¿la dijo o no?).
  - **Nivel avanzado**: puntuación de calidad (distancia de edición / coincidencia fonética) con umbral de acierto.
- Catálogo de **claves i18n** para los mensajes de voz (es/en/br), con validador `check:i18n`.

### No incluido

- Crear el **formulario visual** de registro/login (otro requerimiento).
- Implementar el **endpoint en la nube** del motor de voz (depende del backend Nest req 004); acá solo se define la interfaz del adapter `cloud` y un stub, dejando el cableado real para cuando el ackend exista.
- Reconocimiento **offline** completo (Web Speech ya depende del navegador; el modo cloud queda pendiente de backend).
- Dictado de texto libre largo (más allá de llenar campos y comandos puntuales).

## 5. Diseño técnico

### 4.1 Arquitectura por capas

```
┌─────────────────────────────────────────────────────────────┐
│  Componente (form, video, evaluación)                       │
│  declara: commands[], activablePorRaycaster, motor          │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Núcleo de voz  useVoiceControl() / VoiceInteractionService │
│  - registro de comandos (keyword → acción)                  │
│  - gestión de ciclo de escucha (start/stop/restart)         │
│  - normalización de transcript (minúsculas, acentos)        │
│  - matching de comandos (exacto / contiene)                 │
│  - emite eventos: onCommand, onTranscript, onError          │
└──────────────┬───────────────────────────┬──────────────────┘
               ▼                           ▼
┌────────────────────────┐   ┌────────────────────────────────┐
│ Adapter browser        │   │ Adapter cloud (stub en esta fase)│
│ Web Speech API         │   │ POST /api/speech/recognize      │
│ (SpeechRecognition)    │   │ (backend Nest, req 004/005)     │
└────────────────────────┘   └────────────────────────────────┘
```

### 4.2 Núcleo: `useVoiceControl`

Hook React (con una versión A-Frame espejo) que expone:

```js
const voice = useVoiceControl({
  motor: 'browser' | 'cloud',      // por componente
  lang: 'es-ES' | 'en-US' | 'pt-BR',
  commands: {
    play:  { keywords: ['play', 'reproducir', 'reproduce'], action: 'play' },
    pause: { keywords: ['pausa', 'pausar', 'detener'],       action: 'pause' },
  },
  activation: 'keyword' | 'raycaster' | 'both',
});
// voice.isListening, voice.transcript, voice.lastCommand, voice.start(), voice.stop()
```

- **Normalización del transcript**: minúsculas, sin tildes (`á→a`), trim; así el matching no se
  rompe por acentos ni mayúsculas.
- **Matching**: cada comando define `keywords[]`; gana el comando cuya keyword esté contenida en el transcript final. Los emojis de feedback viven en los locales (no en el código).

### 4.3 Adapters intercambiables

| Adapter | Implementación | Exactitud | Dependencia |
|---|---|---|---|
| `browser` | `SpeechRecognition`/`webkitSpeechRecognition` (ya en `VoiceController.jsx`) | media | navegador + red (Chrome/Safari) |
| `cloud` | `fetch('/api/speech/recognize', { audio })` → transcript | alta | backend Nest (req 004), pendiente |

La **interfaz es común** (`recognize(): Promise<{ transcript, confidence }>`); el núcleo no conoce el motor concreto. El adapter `cloud` queda como **stub** documentado hasta que exista el endpoint.

### 4.4 Activación por raycaster (apuntado)

Cada elemento interactivo se marca como activable (clase/atributo `data-voice-target`). Al hacer focus/gaze sobre él (usando el raycaster de `VRCursor`/`VRPointer` en R3F, o el cursor A-Frame), se **arm** el micrófono para ese componente (o se dispara su acción primaria). Esto permite activar un componente **sin palabra clave** (ej. mirar el botón "play" y decir "activa", o simplemente mirar + click/gaze).

### 4.5 Fases de entrega (orden definido)

- **Fase 1 — Formularios**: comando genérico de dictado por campo. Mapea `onTranscript` al `<input>`
  enfocado. Comandos: `campo siguiente`, `campo anterior`, `enviar`, `limpiar`.
- **Fase 2 — Video**: mapeo de `action` (`play`/`pause`/`stop`/`mute`/`unmute`/`seek`/`volume`) a
  los métodos de `VRVideoLocal.jsx` / `VRYoutubePlayer.jsx` (y `video-controls` de A-Frame).
- **Fase 3 — Evaluación**: `evaluatePronunciation(expected, transcript, level)` → en `basic`
  devuelve `matched: boolean`; en `advanced` devuelve `{ score, matched }` (Levenshtein normalizado
  y/o normalización fonética). El umbral de acierto es configurable por nivel.

### 4.6 Opciones consideradas

| Opción | Decisión | Motivo |
|---|---|---|
| Mantener las 2 implementaciones separadas (React + A-Frame) | Descartada | Duplica lógica y no escala a formularios/evaluación. |
| Forzar un solo motor (solo Web Speech) | Descartada | No cubre la precisión requerida en evaluación avanzada. |
| **Núcleo unificado + adapters intercambiables (browser/cloud)** | **Elegida** | Reutilizable, desacoplado, y permite elegir motor por componente. |

## 6. Archivos a modificar / crear

| Archivo | Acción |
|---|---|
| `src/hooks/useVoiceControl.js` (o `src/components/VRConfig/`) | Núcleo de voz: registro de comandos, matching, ciclo de escucha, eventos. |
| `src/services/voice/browserAdapter.js` | Adapter Web Speech API (extraído de `VoiceController.jsx`). |
| `src/services/voice/cloudAdapter.js` | Adapter cloud (stub + contrato `POST /api/speech/recognize`). |
| `src/services/voice/pronunciation.js` | Función pura de evaluación (básico/avanzado) + `.spec.ts`. |
| `src/components/VRViews/VRVideoLocal.jsx` | Integrar comandos de video (play/pause/seek/volumen). |
| `src/components/VRViews/VRYoutubePlayer.jsx` | Idem para YouTube. |
| `src/views/A-frame/components/VRVideoAf/VRYoutubeVideo/VideoControls.js` | Conectar `video-controls` a comandos de voz (o delegar al núcleo). |
| `src/views/ARs/ARScomponents/overlays/VRVoiceController.jsx` | Refactorizar para usar el núcleo (o deprecar en favor del nuevo). |
| `src/views/ARs/ARScomponents/VoiceController.jsx` | Refactorizar/extraer su lógica al adapter `browser`. |
| `src/components/VRUser/VRCursor.jsx` / `VRPointer.jsx` | Exponer evento de focus/gaze para activación por raycaster. |
| `src/locales/{es,en,br}.json` | Claves de feedback/mensajes de voz. |
| `scripts/check-i18n.mjs` | (sin cambios; se usa para validar las claves nuevas). |

## 7. Criterios de aceptación

- [ ] Existe un núcleo único (`useVoiceControl`) que registra comandos por componente con
      `keywords[]` y emite `onCommand`/`onTranscript`.
- [ ] El núcleo soporta **dos adapters** (`browser` y `cloud`) tras una interfaz común
      `recognize()`; el `cloud` queda como stub con contrato documentado.
- [ ] La normalización del transcript (minúsculas/sin acentos) funciona en es/en/pt.
- [ ] Un componente puede activarse **por palabra clave** y/o **por apuntado (raycaster/gaze)**.
- [ ] **Fase 1**: el dictado llena un `<input>` enfocado y soporta "campo siguiente"/"enviar".
- [ ] **Fase 2**: los comandos `play`, `pause`, `stop`, `mute` y `volumen` controlan
      `VRVideoLocal.jsx` y `VRYoutubePlayer.jsx`.
- [ ] **Fase 3**: `evaluatePronunciation` devuelve `matched` (nivel básico) y
      `{ score, matched }` (nivel avanzado), con función pura + `.spec.ts`.
- [ ] Los mensajes de voz están en los 3 locales y `npm run check:i18n` pasa sin errores.
- [ ] `npm run build` compila sin errores y `npm test` (o equivalente) pasa para la función pura de
      evaluación.

## 8. Referencias

- Voz existente: `src/views/ARs/ARScomponents/VoiceController.jsx`,
  `src/views/ARs/ARScomponents/overlays/VRVoiceController.jsx`.
- Reproductores: `src/components/VRViews/VRVideoLocal.jsx`, `VRYoutubePlayer.jsx`, `VideoBox.jsx`.
- Cursor/raycaster: `src/components/VRUser/VRCursor.jsx`, `VRPointer.jsx`,
  `src/views/A-frame/components/VRUserAf/VRCursor.js`.
- Backend NestJS (dependencia del adapter cloud): `Requerimientos/2-Developing/004-backend-nestjs-arquitectura-crud/`.
- Autenticación (origen del formulario): `Requerimientos/1-Pending/005-roles-perfiles-planes-pago/`.
- Skill de backend: `.agents/skills/backend-nestjs/SKILL.md`.
- Skill de i18n: `.agents/skills/texto-multidioma/SKILL.md`.

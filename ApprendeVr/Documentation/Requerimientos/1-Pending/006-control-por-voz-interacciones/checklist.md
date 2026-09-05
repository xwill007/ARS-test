# Checklist de ejecución — Control por voz e interacción por componentes

### Fase 0 — Fundaciones del núcleo (prerequisito)

- [ ] 0.1 Crear el hook `useVoiceControl` con: registro de comandos (`keywords[]`), ciclo de escucha (start/stop/restart), normalización de transcript (minúsculas + sin acentos) y emisión de eventos (`onCommand`, `onTranscript`, `onError`).
- [ ] 0.2 Definir la interfaz común de adapter `recognize(): Promise<{ transcript, confidence }>`.
- [ ] 0.3 Extraer el adapter `browserAdapter` desde la lógica de `VoiceController.jsx` (Web Speech API).
- [ ] 0.4 Crear `cloudAdapter` como stub con contrato `POST /api/speech/recognize` (sin backend aún).
- [ ] 0.5 Definir la función pura de normalización `normalizeTranscript()` + su `.spec.ts`.
- [ ] 0.6 Validar con `npm run build` que el núcleo compila.

### Fase 1 — Interacción con formularios (registro/login)

- [ ] 1.1 Comando de dictado: mapear `onTranscript` al `<input>`/`<textarea>` enfocado.
- [ ] 1.2 Comandos de navegación de formulario: "campo siguiente", "campo anterior", "enviar", "limpiar".
- [ ] 1.3 Soportar activación por apuntado (raycaster/gaze) sobre el campo enfocado.
- [ ] 1.4 Agregar claves i18n de feedback de voz (es/en/br).
- [ ] 1.5 Verificar con un formulario de prueba (input nombre + email + password) que el dictado llena y navega los campos.

### Fase 2 — Controles del reproductor de video

- [ ] 2.1 Comandos `play`, `pause`, `stop` sobre `VRVideoLocal.jsx`.
- [ ] 2.2 Comandos `mute`/`unmute` y `subir/bajar volumen`.
- [ ] 2.3 Comandos `avanzar`/`retroceder N segundos` (seek).
- [ ] 2.4 Integrar los mismos comandos en `VRYoutubePlayer.jsx`.
- [ ] 2.5 Conectar `video-controls` (A-Frame) al núcleo (o delegar al núcleo React).
- [ ] 2.6 Refactorizar `VRVoiceController.jsx` / `VoiceController.jsx` para usar el núcleo unificado.

### Fase 3 — Evaluación de pronunciación (palabras y frases)

- [ ] 3.1 Función pura `evaluatePronunciation(expected, transcript, level)`.
- [ ] 3.2 Nivel **básico**: coincidencia simple (`matched: boolean`).
- [ ] 3.3 Nivel **avanzado**: `{ score, matched }` con distancia de edición (Levenshtein
      normalizado) y/o normalización fonética + umbral configurable.
- [ ] 3.4 `.spec.ts` de la función pura (casos: match exacto, mismatch, acentos, umbral, frases).
- [ ] 3.5 Conectar la evaluación a los niveles de palabras/frases (Nivel 1/2 palabras, Nivel 3 frases).

### Fase 4 — Verificación y cierre

- [ ] 4.1 `npm run build` compila sin errores.
- [ ] 4.2 `npm run check:i18n` pasa sin errores (claves de voz en los 3 locales).
- [ ] 4.3 Tests de la función pura de evaluación pasan (`npm test`).
- [ ] 4.4 Probar end-to-end: dictar un campo, controlar el video por voz, y evaluar una palabra.
- [ ] 4.5 Marcar criterios de aceptación de la sección 6.

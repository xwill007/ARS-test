# Requerimiento 006 — Control por voz e interacción por componentes — Estrategia de testing

Casos de prueba del requerimiento. Los criterios verificables están en `requerimiento.md` →
sección 6 (Criterios de aceptación).

## Unitarios (funciones puras)

| # | Función | Caso | Resultado esperado |
|---|---|---|---|
| 1 | `normalizeTranscript` | "REPRODUCIR!" → "reproducir" | minúsculas, sin signos |
| 2 | `normalizeTranscript` | "Pausár" → "pausar" | sin tildes |
| 3 | `normalizeTranscript` | texto vacío / solo espacios | `''` |
| 4 | `evaluatePronunciation` básico | esperado "hello" vs transcript "hello" | `matched: true` |
| 5 | `evaluatePronunciation` básico | "hello" vs "world" | `matched: false` |
| 6 | `evaluatePronunciation` avanzado | "casa" vs "caza" (1 sustitución) | `score` alto, `matched` según umbral |
| 7 | `evaluatePronunciation` avanzado | frases con espacios | normaliza y compara token a token |
| 8 | `evaluatePronunciation` avanzado | transcript vacío | `score: 0`, `matched: false` |

## Integración (adapters)

| # | Caso | Resultado esperado |
|---|---|---|
| 9 | `browserAdapter` en navegador sin soporte | error controlado, no crash |
| 10 | `cloudAdapter` stub sin backend | devuelve error "backend no disponible" o mock |
| 11 | `useVoiceControl` registra comandos y matchea keyword | emite `onCommand` con la acción correcta |

## End-to-end

| # | Caso | Resultado esperado |
|---|---|---|
| 12 | Dictar nombre en un input enfocado | el input se llena con el transcript |
| 13 | "campo siguiente" | foco pasa al siguiente input |
| 14 | Decir "reproducir"/"pausar" | el video responde play/pause |
| 15 | Evaluar una palabra bien pronunciada | `matched: true` (básico) / `score` alto (avanzado) |

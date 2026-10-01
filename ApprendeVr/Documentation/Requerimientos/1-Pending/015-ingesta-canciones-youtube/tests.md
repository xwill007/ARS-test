# Estrategia y casos de test

## Estrategia

Misma regla del skill `backend-nestjs`: separar la lógica pura y testeable sin red/proceso externo
(parseo de VTT, tokenización de frases en palabras, slug de archivo, normalización de URL) de los
efectos (invocar `yt-dlp`, llamar a LibreTranslate por HTTP, leer/escribir el repo). Los tests
unitarios del backend nunca deben invocar el binario `yt-dlp` real ni un LibreTranslate real — se
mockean sus clientes. El flujo end-to-end (URL real de YouTube → canción cantable) se verifica
manualmente, igual que el resto de las vistas A-Frame de este proyecto.

## Casos — Backend (Jest, unitarios) — implementados

| Archivo | Caso | Resultado esperado |
|---|---|---|
| `youtube-captions.util.spec.ts` | Parsear un VTT típico de auto-subtítulos (con superposición de líneas) | `[{ text, startTime }]` sin duplicar texto solapado |
| `youtube-captions.util.spec.ts` | Parsear un VTT vacío/sin cues | `[]` |
| `youtube-captions.util.spec.ts` | `normalizeYoutubeUrl` / `extractYoutubeVideoId` (watch/you.tu/embed/shorts, playlist params) | ID correcto, URL canónica `watch?v=<id>` |
| `youtube-captions.util.spec.ts` | `captionTextOrNull` descarta `(dog barking)`/`[Music]`/`♪` | `null` o texto limpio |
| `translation.util.spec.ts` | `translateText('Hello', 'en', 'es')` con fetch mockeado | `'Hola'` |
| `translation.util.spec.ts` | Fetch mockeado devolviendo error de red / status != 2xx | Rechaza/propaga el error de forma controlada |
| `lyrics.util.spec.ts` | `tokenizeWords('This Romeo is bleeding')` | tokens únicos en minúsculas, conserva apóstrofo de contracciones, descarta signos |
| `phrases.service.spec.ts` | `create(dto)` | `save()` llamado con `time`/`ingles_frase`/`espanol_frase` |
| `words.service.spec.ts` | `create(songId, phraseId, english, spanish)` | `save()` llamado con esos campos, incluido `phraseId` |
| `youtube-video.util.spec.ts` | `slugifyFileName(title, author)` | nombre válido, sin caracteres problemáticos |
| `song-ingestion.service.spec.ts` | `lyricsFromYoutube` caso feliz (2 frases, traducción ok) | crea 2 frases + N palabras (traducidas), sin tocar el video |
| `song-ingestion.service.spec.ts` | `lyricsFromYoutube` sin captions | `BadRequestException`, no crea nada |
| `song-ingestion.service.spec.ts` | `lyricsFromYoutube` traducción falla | todo o nada, no inserta frases ni palabras |
| `song-ingestion.service.spec.ts` | `lyricsFromYoutube` sin `libreTranslateUrl` | `BadRequestException` |
| `song-ingestion.service.spec.ts` | `downloadVideo` con `archivo` existente | reutiliza fila vía `markAsDownloaded`, no crea nueva |
| `song-ingestion.service.spec.ts` | `downloadVideo` sin `archivo` | crea canción `source: ['youtube','server']` + `url` |
| `song-ingestion.service.spec.ts` | `downloadVideoToDevice` (existente / nueva) | `markAsLocal` / crea `source: ['youtube','local']`, archivo temporal |
| `lyrics-from-youtube.dto.spec.ts` | Payload válido / sin `youtubeUrl` / sin `archivo` | acepta / rechaza |
| `download-video.dto.spec.ts` | Payload válido / mínimo | acepta / rechaza |
| `song-ingestion.controller.spec.ts` | `POST /song-ingestion/lyrics-from-youtube` / `download-video` / `download-video-to-device` | delega al service con el DTO validado |
| `user-settings.util.spec.ts` | `isValidAframeViewConfig` con subconjunto (solo `youtubeVideo`) | válido (antes fallaba exigiendo las claves completas) |
| `user-settings.service.spec.ts` | `saveConfig` con guardado parcial | merge superficial, no reemplazo (conserva claves previas) |

## Casos — Integración manual (backend + LibreTranslate levantados) — verificados

| Caso | Resultado esperado |
|---|---|
| URL de YouTube con subtítulos automáticos en inglés ("Always" de Bon Jovi) | `lyrics-from-youtube` crea 68 frases con `tiempo_frase` creciente y 371 palabras traducidas, sin archivo de video |
| Misma URL con `download-video` | Canción con `fileName` local (`.mp4` en `public/videos/karaoke/`), `source: ['youtube','server']`, `url_cancion` conservada |
| Misma URL con `download-video-to-device` | Streamea el `.mp4` al navegador (header `X-File-Name`), `source: ['youtube','local']`, temporal borrado |
| URL sin subtítulos | `lyrics-from-youtube` responde `NO_LYRICS_FOUND`, nada guardado |

## Casos — Manual en navegador (`mirror-fix`) — verificados

| Caso | Resultado esperado |
|---|---|
| Overlay `songText` en el menú ⚙️ de AR-SYNC | Aparece como checkbox independiente, seleccionable por separado |
| Botón "GET TEXT FROM YOUTUBE" con URL válida | Crea las frases/palabras y las muestra en la lista |
| Botón "SAVE VIDEO YOUTUBE IN SERVER" | Descarga al servidor, la canción queda pública y reproducible en el overlay `karaoke` |
| Botón "SAVE VIDEO YOUTUBE IN LOCAL" | Descarga al dispositivo (IndexedDB), canción privada |
| Overlay `youtubeVideo` activado | Muestra el video embebido en ambos paneles; con URL vacía muestra input + placeholder |
| Marcador 📍/d-pad del overlay `youtubeVideo` | Guarda posición con 200 (no 400); recargar reaplica la posición |
| Botón "BUSCAR EN YOUTUBE" | Abre pestaña nueva con la sesión real del usuario |
| Botón "PEGAR URL DEL PORTAPAPELES" (dentro de `mirror-fix`) | Lee el portapapeles y agrega la URL al campo |
| "PREVIEW ON YOUTUBE" | Panel flotante embebido (toggle); en AR-SYNC activa el overlay `youtubeVideo` |
| Doble panel: escribir/pegar en `VRNewSongAf` | Se replica al panel opuesto (~300ms) |
| Las 3 canciones locales del dump | Siguen usando `<a-video>`/textura 3D en el overlay `karaoke`, sin regresión |

## Casos — Pendientes (no implementados)

| Caso | Resultado esperado |
|---|---|
| URL de YouTube sin subtítulos, pero encontrada en LRCLIB por artista+título | (Pendiente) crear canción usando la letra de LRCLIB |
| Cantar una canción en modo streaming con el overlay `youtube-karaoke` | (Pendiente) dos iframes `YT.Player` sincronizados play/pause/seek |

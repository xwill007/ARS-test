# Estrategia y casos de test

## Estrategia

Misma regla del skill `backend-nestjs`: separar la lógica pura y testeable sin red/proceso externo
(parseo de VTT/SRT/LRC, tokenización de frases en palabras) de los efectos (invocar `yt-dlp`,
llamar a LibreTranslate/LRCLIB por HTTP, leer/escribir el repo). Los tests unitarios del backend
nunca deben invocar el binario `yt-dlp` real ni un LibreTranslate real — se mockean sus clientes.
El flujo end-to-end (URL real de YouTube → canción cantable) se verifica manualmente, igual que el
resto de las vistas A-Frame de este proyecto (no hay suite automatizada de frontend todavía, ver
Requerimiento 008 en `1-Pending`).

## Casos — Backend (Jest, unitarios)

| Archivo | Caso | Resultado esperado |
|---|---|---|
| `youtube-captions.util.spec.ts` | Parsear un VTT típico de auto-subtítulos (con superposición de líneas) | `[{ text, time }]` sin duplicar texto solapado |
| `youtube-captions.util.spec.ts` | Parsear un VTT vacío/sin cues | `[]` |
| `lrclib.util.spec.ts` | Parsear una respuesta LRC válida de LRCLIB | `[{ text, time }]` equivalente |
| `lrclib.util.spec.ts` | Respuesta de LRCLIB sin `syncedLyrics` (solo `plainLyrics`) | `[]` (no hay tiempos que usar) |
| `translation.util.spec.ts` | `translateText('Hello', 'en', 'es')` con fetch mockeado devolviendo `{translatedText:'Hola'}` | `'Hola'` |
| `translation.util.spec.ts` | Fetch mockeado devolviendo error de red | Rechaza/propaga el error de forma controlada |
| `phrases.service.spec.ts` | `create(songId, english, spanish, time)` | `save()` llamado con esos campos |
| `words.service.spec.ts` | `create(songId, phraseId, english, spanish)` | `save()` llamado con esos campos, incluido `phraseId` |
| `youtube-video.util.spec.ts` | Construcción del nombre de archivo/comando a partir de título+autor | nombre de archivo válido, sin caracteres problemáticos |
| `song-ingestion.service.spec.ts` | Caso feliz `sourceMode: 'stream'`: captions con 2 frases, traducción ok | crea 1 canción (`fileName` = video ID, `youtubeVideoUrl` = la URL recibida) + 2 frases + N palabras, sin llamar a `youtube-video.util` |
| `song-ingestion.service.spec.ts` | Caso feliz `sourceMode: 'download'` | llama primero a `youtube-video.util` (descarga), luego crea la canción con el `fileName` local devuelto y `youtubeVideoUrl` también seteado |
| `song-ingestion.service.spec.ts` | Sin subtítulos de YouTube, LRCLIB también vacío (ambos modos) | lanza error explícito, no llama a `SongsService.create` |
| `song-ingestion.service.spec.ts` | Traducción falla en una frase puntual | el error no deja canción a medio guardar (todo o nada) |
| `create-from-youtube.dto.spec.ts` | Payload válido / sin `youtubeUrl` / sin `title` / `sourceMode` inválido | acepta / rechaza según corresponda |
| `song-ingestion.controller.spec.ts` | `POST /song-ingestion/from-youtube` | delega al service con el DTO validado |

## Casos — Integración manual (backend + LibreTranslate levantados)

| Caso | Resultado esperado |
|---|---|
| URL de YouTube con subtítulos automáticos en inglés, `sourceMode: 'stream'` | Canción creada (`fileName` = video ID), frases con `time` creciente, palabras traducidas, sin archivo de video |
| Misma URL con `sourceMode: 'download'` | Canción creada con `fileName` local (`.mp4` en `public/videos/karaoke/`), mismas frases/palabras |
| URL de YouTube sin subtítulos, pero encontrada en LRCLIB por artista+título | Canción creada usando la letra de LRCLIB (en cualquiera de los dos modos) |
| URL sin subtítulos y sin resultado en LRCLIB | `POST` responde error, nada queda guardado en las 3 tablas (en cualquiera de los dos modos) |
| Confirmar en el filesystem del backend, modo `stream` | No queda ningún `.mp4`/`.webm`, solo el `.vtt`/`.srt` temporal (y se borra al terminar) |
| Confirmar en el filesystem del backend, modo `download` | Queda el `.mp4` en `public/videos/karaoke/`, ningún subtítulo temporal |

## Casos — Manual en navegador (`mirror-fix`)

| Caso | Resultado esperado |
|---|---|
| Activar el overlay `youtube-karaoke` en el menú ⚙️ de AR-SYNC | Aparece como checkbox independiente del overlay `karaoke`, seleccionable por separado |
| Cantar una canción en modo `stream` con el overlay `youtube-karaoke` activo | El iframe se reproduce en ambos paneles estéreo |
| Pausar desde el panel izquierdo (overlay `youtube-karaoke`) | El panel derecho también se pausa (puente de sincronización adaptado) |
| Buscar (seek) desde un panel (overlay `youtube-karaoke`) | El otro panel salta al mismo punto (con la desincronización leve ya aceptada como trade-off) |
| Cantar una canción en modo `download` con el overlay `karaoke` (el de siempre) | Se reproduce exactamente igual que una canción cargada a mano, sin pasar por `youtube-karaoke` |
| Cantar una de las 3 canciones locales del dump | Sigue usando `<a-video>`/textura 3D en el overlay `karaoke`, exactamente como antes de este requerimiento (sin regresión) |
| Arrastrar con el mouse en un panel con `youtube-karaoke` activo | Rota el overlay igual en el panel hermano (puente de cámara, mismo patrón que los demás overlays) |

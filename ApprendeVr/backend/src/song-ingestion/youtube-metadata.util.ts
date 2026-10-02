import { execFile } from 'child_process';
import { promisify } from 'util';
import { normalizeYoutubeUrl } from './youtube-captions.util';

// Metadata de una URL de YouTube (Requerimiento 015, autocompletar título/autor en "New Song" al
// pegar una URL): invoca `yt-dlp --dump-json` (proceso hijo) para leer el título y el "autor" del
// video sin descargar nada. El parseo (`parseYoutubeMetadata`) es puro y testeable sin el binario,
// siguiendo la regla del skill backend-nestjs de separar efectos de lógica.

export interface YoutubeMetadata {
  title: string;
  author: string;
}

const execFileAsync = promisify(execFile);

// Separa el autor del título cuando YouTube devuelve el título en formato "Autor - Titulo"
// (p. ej. "Bon Jovi - Always (Official Music Video)"). Recorta SOLO el prefijo que coincide con el
// autor (case-insensitive) seguido de un separador (`-`, `–`, `—`, `:`, `·`, `|`); si el autor no
// aparece al inicio, devuelve el título tal cual (nunca toca un " - " interno legítimo).
export function cleanYoutubeTitle(title: string, author: string): string {
  const t = String(title || '').trim();
  const a = String(author || '').trim();
  if (!t || !a) return t;
  const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + escaped + '\\s*[-–—:·|]\\s*', 'i');
  return t.replace(re, '').trim();
}

// Parsea la salida de `yt-dlp --dump-json` a `{ title, author }`. El "autor" de una canción se
// toma de `artist` (metadata de música, cuando existe) y cae a `creator`/`uploader`/`channel` (el
// nombre del canal, el dato más cercano disponible en videos sin metadata musical). El título se
// limpia del prefijo "Autor - " (ver `cleanYoutubeTitle`) para que no quede duplicado con el
// autor. Devuelve `null` si el JSON no trae título o es inválido.
export function parseYoutubeMetadata(rawJson: string): YoutubeMetadata | null {
  if (!rawJson) return null;
  let info: Record<string, unknown>;
  try {
    info = JSON.parse(rawJson);
  } catch (e) {
    return null;
  }
  if (!info || typeof info !== 'object') return null;
  const author = String(
    info.artist || info.creator || info.uploader || info.channel || '',
  ).trim();
  const title = cleanYoutubeTitle(String(info.title || ''), author);
  if (!title) return null;
  return { title, author };
}

// Obtiene título/autor de una URL de YouTube. Normaliza la URL (recorta parámetros de playlist que
// cuelgan a `yt-dlp`) y usa `--dump-json --no-playlist --skip-download`. Devuelve `null` si la URL
// no se reconoce o `yt-dlp` falla (el llamador decide cómo degradar).
export async function fetchYoutubeMetadata(
  youtubeUrl: string,
): Promise<YoutubeMetadata | null> {
  const normalized = normalizeYoutubeUrl(youtubeUrl);
  if (!normalized) return null;
  try {
    const { stdout } = await execFileAsync(
      'yt-dlp',
      ['--dump-json', '--no-playlist', '--skip-download', normalized],
      { timeout: 30000 },
    );
    return parseYoutubeMetadata(stdout);
  } catch (e) {
    return null;
  }
}

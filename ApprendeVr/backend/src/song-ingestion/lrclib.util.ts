// Fuente de letra "LRCLIB" (Requerimiento 015, botón "GET TEXT LYRICS" del overlay "Song Text").
// LRCLIB (https://lrclib.net) es una API gratuita y sin key que devuelve letras sincronizadas (LRC)
// para canciones buscadas por artista + título. Se usa como FUENTE ALTERNATIVA a los subtítulos de
// YouTube: cuando una canción ya tiene frases pero muchas quedaron sin tiempo (00:00:00.0), LRCLIB
// provee la letra con tiempos que se puede mapear a esas frases (ver lyrics-comparison.util.ts).
//
// El parseo (`parseLrcToLines`) es puro y testeable sin red; la llamada HTTP (`fetchLrclibLyrics`)
// es un efecto aislado, siguiendo la regla del skill backend-nestjs de separar efectos de lógica.

export interface StagedLyric {
  text: string;
  startTime: number;
}

const LRCLIB_API = 'https://lrclib.net/api/get';

// Parsea un string LRC (formato `[mm:ss.xx]texto`) a `[{ text, startTime }]` (startTime en
// segundos float). Soporta varios timestamps por línea (repite el texto en cada uno), descarta las
// líneas de metadatos (`[ti:...]`, `[ar:...]`, etc., que no matchean el patrón de tiempo) y quita
// las notas musicales (♪). Devuelve la lista ordenada por tiempo de inicio.
export function parseLrcToLines(lrc: string): StagedLyric[] {
  const timeRegex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  const out: StagedLyric[] = [];

  for (const line of String(lrc || '').split(/\r?\n/)) {
    timeRegex.lastIndex = 0;
    const times: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = timeRegex.exec(line)) !== null) {
      const m = parseInt(match[1], 10);
      const s = parseInt(match[2], 10);
      const frac = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      times.push(m * 60 + s + frac / 1000);
    }
    if (!times.length) continue;
    const text = line
      .replace(timeRegex, '')
      .replace(/♪/g, '')
      .trim();
    if (!text) continue;
    for (const t of times) out.push({ text, startTime: t });
  }

  out.sort((a, b) => a.startTime - b.startTime);
  return out;
}

// Cliente HTTP de LRCLIB. Devuelve las líneas sincronizadas (`syncedLyrics`) parseadas, o `[]` si
// no hay letra sincronizada para esa canción (404, respuesta sin `syncedLyrics`, o error de red).
// `artistName`/`trackName` van URL-encoded como query params.
export async function fetchLrclibLyrics(
  artistName: string,
  trackName: string,
): Promise<StagedLyric[]> {
  const url =
    LRCLIB_API +
    '?artist_name=' +
    encodeURIComponent(artistName) +
    '&track_name=' +
    encodeURIComponent(trackName);
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  if (!data || typeof data.syncedLyrics !== 'string' || !data.syncedLyrics) {
    return [];
  }
  return parseLrcToLines(data.syncedLyrics);
}

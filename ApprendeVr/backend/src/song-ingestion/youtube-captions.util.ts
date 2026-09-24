import { execFile } from 'child_process';
import { mkdtemp, readdir, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

// Fuente de letra "subtítulos de YouTube" (Requerimiento 015, botón "GET TEXT FROM YOUTUBE").
// Invoca `yt-dlp --write-auto-sub --skip-download` (proceso hijo) para bajar los subtítulos
// automáticos en inglés y parsea el VTT resultante a una lista de frases con tiempo de inicio.
//
// El parseo (`parseVttToPhrases` y sus helpers) es puro y testeable sin invocar el binario; la
// invocación de `yt-dlp` (efecto) queda aislada en `fetchYoutubePhrases`, para cumplir la regla
// del skill backend-nestjs de separar efectos de lógica.

export interface CaptionLine {
  text: string;
  startTime: number;
}

const execFileAsync = promisify(execFile);

// Extrae el video ID de las formas usuales de URL de YouTube (watch?v=, youtu.be/, embed/,
// shorts/). Devuelve null si no matchea.
export function extractYoutubeVideoId(url: string): string | null {
  const m = String(url || '').match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  return m ? m[1] : null;
}

// Normaliza cualquier forma de URL de YouTube a su forma canónica `watch?v=<id>`. Las URLs con
// parámetros de playlist (`&list=...&index=...`) hacen que `yt-dlp` procese la playlist entera
// (y se cuelgue), así que se recorta a solo el video antes de invocarlo.
export function normalizeYoutubeUrl(url: string): string | null {
  const id = extractYoutubeVideoId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

// '00:00:01.440' (o con coma, o sin milisegundos) → segundos float.
export function parseVttTimestamp(ts: string): number {
  const m = String(ts || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2}):(\d{2})(?:[.,](\d{1,3}))?$/);
  if (!m) return NaN;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = parseInt(m[3], 10);
  let ms = 0;
  if (m[4]) ms = parseInt(m[4].padEnd(3, '0'), 10);
  return h * 3600 + min * 60 + sec + ms / 1000;
}

// Quita las notas musicales (♪) que YouTube antepone a cada verso y colapsa espacios/saltos.
export function cleanCaptionText(raw: string): string {
  return (raw || '')
    .replace(/♪/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Devuelve el texto limpio, o null si el cue es solo un efecto de sonido/música (p. ej.
// "(dog barking)", "[Music]") y no letra cantada. Heurística simple: los efectos de los
// auto-subtítulos vienen envueltos entre paréntesis/corchetes.
export function captionTextOrNull(raw: string): string | null {
  const text = cleanCaptionText(raw);
  if (!text) return null;
  if (/^[\(\[].*[\)\]]$/.test(text)) return null;
  return text;
}

// Parsea un VTT de subtítulos a `[{ text, startTime }]`, descartando los cues que son solo
// sonidos y uniendo los versos que vienen repartidos en varias líneas dentro del mismo cue.
export function parseVttToPhrases(vtt: string): CaptionLine[] {
  const lines = String(vtt || '').split(/\r?\n/);
  const phrases: CaptionLine[] = [];
  let currentStart = NaN;
  let currentText: string[] = [];
  let sawCue = false;

  const flush = () => {
    if (!sawCue) return;
    const text = currentText.join(' ').trim();
    const cleaned = captionTextOrNull(text);
    if (cleaned && Number.isFinite(currentStart)) {
      phrases.push({ text: cleaned, startTime: currentStart });
    }
    currentText = [];
    sawCue = false;
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      flush();
      continue;
    }
    const timeMatch = t.match(/^(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})\s+-->\s+/);
    if (timeMatch) {
      flush();
      currentStart = parseVttTimestamp(timeMatch[1]);
      sawCue = true;
      continue;
    }
    // Líneas de texto del cue (ignora el header WEBVTT/Kind/Language porque `sawCue` es false
    // antes del primer timestamp).
    if (sawCue) currentText.push(t);
  }
  flush();
  return phrases;
}

// Segundos → 'HH:MM:SS.d' (formato TIME(1) de MySQL, una décima) para `frases_vr.tiempo_frase`.
export function secondsToHms(sec: number): string {
  const rounded = Math.max(0, Math.round(sec * 10) / 10);
  const whole = Math.floor(rounded);
  const tenth = Math.round((rounded - whole) * 10);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return pad(h) + ':' + pad(m) + ':' + pad(s) + '.' + tenth;
}

// Invoca `yt-dlp` para bajar los subtítulos automáticos en inglés de `youtubeUrl` (sin descargar
// el video) y devuelve las frases parseadas. Devuelve `[]` si no hay subtítulos. Borra el archivo
// temporal al terminar.
export async function fetchYoutubePhrases(youtubeUrl: string): Promise<CaptionLine[]> {
  const normalized = normalizeYoutubeUrl(youtubeUrl);
  if (!normalized) return [];
  const dir = await mkdtemp(join(tmpdir(), 'apprendevr-captions-'));
  const outTemplate = join(dir, 'sub.%(ext)s');
  try {
    await execFileAsync(
      'yt-dlp',
      [
        '--write-auto-sub',
        '--sub-lang',
        'en',
        '--skip-download',
        '--sub-format',
        'vtt',
        '-o',
        outTemplate,
        normalized,
      ],
      { timeout: 60000 },
    );
    const files = await readdir(dir);
    const vttFile = files.find((f) => f.endsWith('.vtt') || f.endsWith('.srt'));
    if (!vttFile) return [];
    const content = await readFile(join(dir, vttFile), 'utf8');
    return parseVttToPhrases(content);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

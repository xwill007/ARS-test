import { execFile } from 'child_process';
import { resolve } from 'path';
import { promisify } from 'util';
import { normalizeYoutubeUrl } from './youtube-captions.util';

// Descarga del video completo (Requerimiento 015, botón "SAVE VIDEO YOUTUBE IN LOCAL"): invoca
// `yt-dlp` (proceso hijo) para bajar el mejor video+audio y fusionarlos a MP4 con `ffmpeg`, y lo
// guarda en la carpeta de karaoke. La construcción del nombre de archivo (`slugifyFileName`) es
// pura y testeable sin invocar el binario.

const execFileAsync = promisify(execFile);

// Carpeta donde el overlay karaoke (`VRKaraokeAf`) espera los archivos reproducibles como textura
// 3D: `ApprendeVr/frontend/public/videos/karaoke/` (servida por Vite en `/videos/karaoke/`). El
// backend corre desde `ApprendeVr/backend`, por eso el default apunta a `../frontend/...`.
export function karaokeVideosDir(): string {
  return resolve(
    process.cwd(),
    process.env.KARAOKE_VIDEOS_DIR ?? '../frontend/public/videos/karaoke',
  );
}

// 'Stand By Me' + 'Ben E. King' → 'Stand-By-Me-Ben-E-King.mp4'. Normaliza acentos/puntuación y
// colapsa separadores, dejando un nombre de archivo seguro.
export function slugifyFileName(title: string, author?: string): string {
  const base = [title, author].filter(Boolean).join('-');
  const slug = (base || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return (slug || 'song') + '.mp4';
}

// Descarga el video a `outputPath` (ruta absoluta). Requiere `yt-dlp` y `ffmpeg` en el entorno.
export async function downloadYoutubeVideo(
  youtubeUrl: string,
  outputPath: string,
): Promise<void> {
  // Recorta a la URL canónica del video (los params de playlist cuelgan a yt-dlp).
  const normalized = normalizeYoutubeUrl(youtubeUrl);
  if (!normalized) throw new Error('INVALID_YOUTUBE_URL');
  await execFileAsync(
    'yt-dlp',
    [
      '-f',
      // h264/aac dentro de mp4 para máxima compatibilidad de navegadores (Safari/iOS no
      // reproducen vp9/opus en un contenedor mp4). `vcodec^=avc1` fuerza h264 (el "mejor mp4" de
      // VEVO es vp9); cae a `best` si no hay h264.
      'bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/best[vcodec^=avc1]/best',
      '--merge-output-format',
      'mp4',
      '-o',
      outputPath,
      normalized,
    ],
    { timeout: 300000 },
  );
}

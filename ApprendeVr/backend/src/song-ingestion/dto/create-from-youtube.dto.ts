import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

// `POST /song-ingestion/from-youtube` (Requerimiento 015, pendiente P4): pipeline de un solo paso
// que, a partir de una URL de YouTube, crea la canción Y le carga la letra (subtítulos con fallback
// automático a LRCLIB) traducida al español. `sourceMode` decide qué hacer con el video:
//   - 'download': descarga el video al servidor (`source: ['youtube','server']`, pública).
//   - 'stream':   NO descarga nada; deja la canción como `source: ['youtube']` (privada) con
//                 `fileName` = la URL completa de YouTube, lista para reproducirse sin descargar vía
//                 el overlay `youtubeVideo` (YouTube IFrame Player) con la letra en `songText`.
// A diferencia de las acciones separadas (`lyrics-from-youtube`/`download-video`), acá el título es
// obligatorio (no hay `archivo` del que derivarlo: es un alta nueva, no una reutilización).
export const FROM_YOUTUBE_SOURCE_MODES = ['download', 'stream'] as const;
export type FromYoutubeSourceMode = (typeof FROM_YOUTUBE_SOURCE_MODES)[number];

export class CreateFromYoutubeDto {
  @IsString()
  @MinLength(1)
  youtubeUrl: string;

  @IsIn(FROM_YOUTUBE_SOURCE_MODES)
  sourceMode: FromYoutubeSourceMode;

  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  author?: string;
}

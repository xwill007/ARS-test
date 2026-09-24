import { IsOptional, IsString, MinLength } from 'class-validator';

// `POST /song-ingestion/download-video` (Requerimiento 015, botón "SAVE VIDEO YOUTUBE IN LOCAL"
// del overlay "Song Text"): descarga el video de `youtubeUrl` a `public/videos/karaoke/` y lo
// deja reproducible como canción local (`source: 'server'`). Si `archivo` apunta a una canción
// existente (p. ej. la URL guardada de una canción `source: 'youtube'`), se reutiliza esa fila
// (cambia su `fileName` a local y su `source` a 'server'); si no, se crea una canción nueva.
export class DownloadVideoDto {
  @IsString()
  @MinLength(1)
  youtubeUrl: string;

  // Opcional: si `archivo` apunta a una canción existente (p. ej. la URL de una canción
  // `source: 'youtube'`), el título/autor se toman de ESA fila para armar el nombre de archivo.
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  archivo?: string;
}

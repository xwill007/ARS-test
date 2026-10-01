import { IsOptional, IsString, MinLength } from 'class-validator';

// `POST /song-ingestion/lyrics-from-lrclib` (Requerimiento 015, botón "GET TEXT LYRICS" del overlay
// "Song Text"): obtiene la letra sincronizada de LRCLIB para la canción indicada por `archivo` (el
// `fileName` actual, mismo campo que usa `GET /frases?archivo=...`). `artistName`/`trackName` son
// opcionales: si no vienen, el backend deriva el artista/título de la fila de `canciones_vr`
// (columnas `autor_cancion`/`titulo_cancion`).
export class LyricsFromLrclibDto {
  @IsString()
  @MinLength(1)
  archivo: string;

  @IsOptional()
  @IsString()
  artistName?: string;

  @IsOptional()
  @IsString()
  trackName?: string;
}

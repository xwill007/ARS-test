import { IsString, MinLength } from 'class-validator';

// `POST /song-ingestion/lyrics-from-youtube` (Requerimiento 015, botón "GET TEXT FROM YOUTUBE"
// del overlay "Song Text"): obtiene la letra de una URL de YouTube y la guarda como frases de la
// canción identificada por `archivo` (el `fileName` actual, mismo campo que usa
// `GET /frases?archivo=...`). El texto de las frases va a `ingles_frase`; `espanol_frase` queda
// con un placeholder hasta que exista el paso de traducción (LibreTranslate, ver requerimiento).
export class LyricsFromYoutubeDto {
  @IsString()
  @MinLength(1)
  youtubeUrl: string;

  @IsString()
  @MinLength(1)
  archivo: string;
}

import { Matches } from 'class-validator';

// `PATCH /frases/:id/time` (overlay "Song Text", edición del tiempo de las frases): body con el
// nuevo `tiempo_frase` en formato TIME(1) de MySQL (`HH:MM:SS.d`, con la décima opcional — la
// columna acepta también 'HH:MM:SS' y guarda `.0`). El frontend redondea el tiempo capturado a
// décimas antes de enviarlo (ver song-text-modules.js → toHms).
export class UpdatePhraseTimeDto {
  @Matches(/^\d{2}:\d{2}:\d{2}(\.\d)?$/, { message: 'time must be HH:MM:SS or HH:MM:SS.d' })
  time: string;
}

import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

// `POST /frases` (overlay "Song Text", "ADD TEXT SONG" — pedido del usuario): crea una frase nueva
// para la canción indicada por `archivo` (mismo campo que usa `GET /frases?archivo=...`). El texto
// va en inglés y español (`ingles_frase`/`espanol_frase`, igual que el contrato de lectura) y el
// tiempo es opcional: si no se envía, la BD guarda `00:00:00.0` (sin sincronizar), lista para que
// el usuario la ajuste después desde el modo "Edit time".
export class CreatePhraseDto {
  @IsString()
  @MinLength(1)
  archivo: string;

  @IsString()
  @MinLength(1)
  ingles_frase: string;

  @IsString()
  @MinLength(1)
  espanol_frase: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}:\d{2}(\.\d)?$/, {
    message: 'tiempo_frase must be HH:MM:SS or HH:MM:SS.d',
  })
  tiempo_frase?: string;
}

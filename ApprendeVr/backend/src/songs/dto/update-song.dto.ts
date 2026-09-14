import { IsOptional, IsString, MinLength } from 'class-validator';

// Todos los campos opcionales para `PATCH /songs/:id`: se actualiza solo lo que llega en el body.
export class UpdateSongDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  fileName?: string;

  @IsOptional()
  @IsString()
  language?: string;
}

import { IsOptional, IsString, MinLength } from 'class-validator';

// Espeja el alta explícita del legacy (`A-frame/Proyecto/backend/modelos/canciones/
// registrar_canciones.php`): título y archivo obligatorios, autor e idioma opcionales
// (la BD completa `idioma_cancion` con 'ingles' si no se envía; `fecha_hora_cancion` es
// siempre generada por la BD, nunca por el cliente).
export class CreateSongDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsString()
  @MinLength(1)
  fileName: string;

  @IsOptional()
  @IsString()
  language?: string;
}

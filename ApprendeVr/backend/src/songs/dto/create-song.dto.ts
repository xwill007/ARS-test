import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

// Fuentes de reproducción soportadas hoy; se amplía esta lista cuando se agregue una fuente nueva
// (no requiere otra migración de esquema, `fuente_cancion` es un varchar libre en la BD).
export const SONG_SOURCES = ['local', 'youtube'] as const;
export type SongSource = (typeof SONG_SOURCES)[number];

// Espeja el alta explícita del legacy (`A-frame/Proyecto/backend/modelos/canciones/
// registrar_canciones.php`): título y archivo obligatorios, autor e idioma opcionales
// (la BD completa `idioma_cancion` con 'ingles' si no se envía; `fecha_hora_cancion` es
// siempre generada por la BD, nunca por el cliente).
//
// `fileName` guarda el nombre de archivo local cuando `source` es 'local', o la URL completa
// cuando `source` es 'youtube' (Requerimiento 014, ampliación) — sigue siendo obligatorio en
// ambos casos, solo cambia qué representa.
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

  @IsOptional()
  @IsIn(SONG_SOURCES)
  source?: SongSource;
}

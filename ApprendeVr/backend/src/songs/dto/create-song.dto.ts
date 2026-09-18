import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

// Fuentes de reproducción soportadas hoy; se amplía esta lista cuando se agregue una fuente nueva
// (no requiere otra migración de esquema, `fuente_cancion` es un varchar libre en la BD).
// 'server': archivo real en `public/videos/karaoke/` del servidor — PÚBLICA, visible/reproducible
// para cualquier usuario (`SongsService.findAll()` / `GET /songs`). Este es el valor que antes se
// llamaba 'local' (ver Requerimiento 014, ampliación, y db/011-songs-id-usuario.sql, que renombró
// las filas existentes).
// 'local': video que vive solo en el `IndexedDB` del dispositivo del usuario que lo creó, nunca
// sube al servidor — PRIVADA, solo visible/reproducible para ese mismo usuario
// (`SongsService.findMine()` / `GET /songs/mine`), y solo reproducible en el dispositivo donde lo
// agregó (el video no viaja con la metadata).
// 'youtube': URL completa de un video de YouTube — también PRIVADA (pedido del usuario: "con
// fuente local y youtube solo el usuario que las registra"), aunque a diferencia de 'local' sí es
// reproducible desde cualquier dispositivo de ese mismo usuario (la URL sí viaja con la metadata).
// La columna `id_usuario_cancion` es la que distingue "de quién" es cada canción privada.
export const SONG_SOURCES = ['server', 'local', 'youtube'] as const;
export type SongSource = (typeof SONG_SOURCES)[number];

// Espeja el alta explícita del legacy (`A-frame/Proyecto/backend/modelos/canciones/
// registrar_canciones.php`): título y archivo obligatorios, autor e idioma opcionales
// (la BD completa `idioma_cancion` con 'ingles' si no se envía; `fecha_hora_cancion` es
// siempre generada por la BD, nunca por el cliente).
//
// `fileName` guarda el nombre del archivo en `public/videos/karaoke/` cuando `source` es 'server',
// la clave bajo la que el frontend guardó el video en `IndexedDB` cuando `source` es 'local', o la
// URL completa cuando `source` es 'youtube' (Requerimiento 014, ampliación) — sigue siendo
// obligatorio en los tres casos, solo cambia qué representa.
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

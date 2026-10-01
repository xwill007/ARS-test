import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

// `POST /song-ingestion/apply-lyrics-sync` (Requerimiento 015, aprobación del botón "GET TEXT
// LYRICS"): aplica el staging de LRCLIB a `frases_vr` para la canción indicada por `archivo`. Las
// asignaciones de tiempo a frases con 00:00:00.0 se aplican SIEMPRE (es el objetivo del flujo);
// `acceptMismatches` controla si además se insertan como frases nuevas las líneas que no concuerdan
// (texto nuevo de LRCLIB), traduciéndolas al español con LibreTranslate.
export class ApplyLyricsSyncDto {
  @IsString()
  @MinLength(1)
  archivo: string;

  @IsOptional()
  @IsBoolean()
  acceptMismatches?: boolean;
}

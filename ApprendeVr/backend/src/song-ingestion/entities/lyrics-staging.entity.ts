import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Tabla de STAGING de letra sincronizada (Requerimiento 015, botón "GET TEXT LYRICS"): guarda las
// líneas obtenidas de LRCLIB con sus tiempos, pendientes de que el usuario las apruebe antes de
// aplicarlas a `frases_vr`. Es una tabla propia de ApprendeVr (no viene del dump legacy), por eso
// el nombre en español sigue la convención del proyecto pero con sufijo `_staging` para distinguirla
// de `frases_vr`. No tiene columna de traducción: LRCLIB solo devuelve la letra en inglés; la
// traducción al español se hace recién en el paso de aprobación (ver
// `SongIngestionService.applyLyricsSync`), para no traducir líneas que el usuario termina rechazando.
@Entity({ name: 'frases_vr_staging' })
export class StagedPhrase {
  @PrimaryGeneratedColumn({ name: 'id_frase_staging' })
  id: number;

  @Column({ name: 'canciones_id_frase_staging' })
  songId: number;

  @Column({ name: 'ingles_frase_staging', type: 'text' })
  english: string;

  // Momento del video en que empieza esta línea (formato TIME(1), misma convención que
  // `frases_vr.tiempo_frase` — ver db/013). Viene de los segundos del LRC convertidos con
  // `secondsToHms`.
  @Column({ name: 'tiempo_frase_staging', type: 'time' })
  time: string;
}

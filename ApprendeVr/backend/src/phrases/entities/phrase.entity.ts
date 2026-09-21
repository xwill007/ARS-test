import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapea `frases_vr` tal como existe en el dump legacy de `english_vr` (esquema en español, sin
// renombrar — mismo criterio que `usuarios`, ver users/entities/user.entity.ts). La columna
// `español_frase` conserva la ñ tal cual está en la BD.
@Entity({ name: 'frases_vr' })
export class Phrase {
  @PrimaryGeneratedColumn({ name: 'id_frase' })
  id: number;

  @Column({ name: 'canciones_id_frase' })
  songId: number;

  @Column({ name: 'ingles_frase', type: 'text' })
  english: string;

  @Column({ name: 'español_frase', type: 'text' })
  spanish: string;

  // Momento del video en que empieza esta frase (formato TIME de MySQL, ej. '00:00:03') — es la
  // clave para el karaoke y para el overlay "SONG TEXT" (mostrar la frase anterior/actual/futura
  // según el tiempo de reproducción). El driver mysql2 devuelve la columna TIME como string
  // 'HH:MM:SS'; el frontend la convierte a segundos (ver song-text-modules.js).
  @Column({ name: 'tiempo_frase', type: 'time' })
  time: string;
}

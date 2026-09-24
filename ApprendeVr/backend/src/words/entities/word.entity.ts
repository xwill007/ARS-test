import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapea `palabras_vr` tal como existe en el dump legacy de `english_vr` (esquema en español, sin
// renombrar — mismo criterio que `usuarios`, ver users/entities/user.entity.ts).
@Entity({ name: 'palabras_vr' })
export class Word {
  @PrimaryGeneratedColumn({ name: 'id_palabra' })
  id: number;

  @Column({ name: 'esp_palabra', type: 'text' })
  spanish: string;

  @Column({ name: 'ing_palabra', type: 'text' })
  english: string;

  // Frase a la que pertenece esta palabra (Requerimiento 015, pipeline de ingesta): la columna
  // `id_frase_palabra` ya existe en el dump legacy (NOT NULL), pero la entidad no la mapeaba
  // porque el flujo de lectura (`GET /palabras`) no la necesitaba. Es imprescindible para crear
  // palabras nuevas desde `song-ingestion` con su frase de origen.
  @Column({ name: 'id_frase_palabra' })
  phraseId: number;

  @Column({ name: 'id_cancion_palabra' })
  songId: number;
}

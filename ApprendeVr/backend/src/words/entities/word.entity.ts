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

  @Column({ name: 'id_cancion_palabra' })
  songId: number;
}

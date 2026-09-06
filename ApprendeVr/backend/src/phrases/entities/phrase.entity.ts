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
}

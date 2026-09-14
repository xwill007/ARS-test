import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapea `canciones_vr` tal como existe en el dump legacy de `english_vr` (esquema en español, sin
// renombrar — mismo criterio que `usuarios`, ver users/entities/user.entity.ts).
@Entity({ name: 'canciones_vr' })
export class Song {
  @PrimaryGeneratedColumn({ name: 'id_cancion' })
  id: number;

  @Column({ name: 'titulo_cancion' })
  title: string;

  @Column({ name: 'autor_cancion' })
  author: string;

  @Column({ name: 'archivo_cancion' })
  fileName: string;

  // Nullable en el dump (sin NOT NULL): la BD la completa con CURRENT_TIMESTAMP() si no se envía.
  @Column({ name: 'fecha_hora_cancion', type: 'datetime', nullable: true })
  dateTime: Date | null;

  // Nullable en el dump (sin NOT NULL): la BD la completa con 'ingles' si no se envía.
  @Column({ name: 'idioma_cancion', type: 'varchar', length: 50, nullable: true })
  language: string | null;
}

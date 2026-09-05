import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapea la tabla `usuarios` tal como existe hoy en `english_vr` (esquema en español, sin
// renombrar — decisión del requerimiento 004: la migración de renombrado se difiere).
@Entity({ name: 'usuarios' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 225 })
  password: string;

  // Valores existentes en el dump sin normalizar ('0', 'Beginner', 'Intermediate', 'Advanced');
  // normalizar el enum queda fuera de alcance (ver requerimiento 004).
  @Column({ type: 'text', default: '' })
  level: string;

  // Columna `date` en la BD (no `created_at`): se mantiene el nombre literal para no reñombrar
  // el esquema existente. La BD la completa con CURRENT_TIMESTAMP() si no se envía al insertar.
  @Column({ type: 'datetime', name: 'date' })
  date: Date;
}

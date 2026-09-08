import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Catálogo de vistas persistibles en `user_settings` (Requerimiento 012). Acotado a este módulo —
// no es el catálogo `modules` (módulos/vistas + control de acceso) que definirá el Requerimiento
// 005, ver la migración 004-normalize-user-settings-row-per-view.sql para el detalle de por qué se
// mantienen separados por ahora.
@Entity({ name: 'settings_views' })
export class SettingsView {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'view_key', unique: true })
  viewKey: string;

  @Column({ name: 'label', nullable: true })
  label: string | null;
}

import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { SettingsView } from './settings-view.entity';

// Requerimiento 012 (corrección de diseño): una fila por (usuario, vista, dispositivo),
// relacionada por FK contra el catálogo `settings_views` — no una fila por usuario con una columna
// JSON por vista (diseño original de Requerimiento 010, ver migración
// 004-normalize-user-settings-row-per-view.sql). `deviceType` (ver migración
// 006-user-settings-device-type.sql) permite que un mismo usuario guarde un ajuste distinto para
// web y para móvil en la misma vista. Agregar una vista nueva ya no toca esta entidad ni requiere
// ALTER TABLE — solo una fila nueva en `settings_views` y su validador en `user-settings.util.ts`.
@Entity({ name: 'user_settings' })
export class UserSettings {
  @PrimaryColumn({ name: 'user_id' })
  userId: number;

  @PrimaryColumn({ name: 'view_id' })
  viewId: number;

  @PrimaryColumn({ name: 'device_type' })
  deviceType: string;

  @ManyToOne(() => SettingsView)
  @JoinColumn({ name: 'view_id' })
  settingsView: SettingsView;

  @Column({ name: 'config', type: 'json' })
  config: Record<string, unknown>;
}

import { Column, Entity, PrimaryColumn } from 'typeorm';

// Una fila por usuario, una columna JSON por vista (Requerimiento 010). Agregar una vista nueva
// es agregar su columna acá (+ la entrada correspondiente en user-settings.util.ts), sin tocar el
// resto del módulo.
@Entity({ name: 'user_settings' })
export class UserSettings {
  @PrimaryColumn({ name: 'user_id' })
  userId: number;

  @Column({ name: 'login_form_config', type: 'json', nullable: true })
  loginFormConfig: Record<string, unknown> | null;

  @Column({ name: 'aframe_view_config', type: 'json', nullable: true })
  aframeViewConfig: Record<string, unknown> | null;
}

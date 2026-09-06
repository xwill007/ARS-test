import { IsNotEmptyObject, IsObject } from 'class-validator';

// La forma exacta del `config` depende de la vista (`:view` en la ruta) y la valida
// `isValidConfigForView` (user-settings.util.ts) en el service — acá solo se exige que sea un
// objeto no vacío, para rechazar temprano un body claramente mal formado (string, número, `{}`).
export class SaveUserSettingDto {
  @IsObject()
  @IsNotEmptyObject()
  config: Record<string, unknown>;
}

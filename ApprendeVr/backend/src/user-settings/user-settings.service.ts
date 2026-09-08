import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsView } from './entities/settings-view.entity';
import { UserSettings } from './entities/user-settings.entity';
import {
  DeviceType,
  isKnownDeviceType,
  isKnownView,
  isValidConfigForView,
  SettingsView as SettingsViewKey,
} from './user-settings.util';

@Injectable()
export class UserSettingsService {
  constructor(
    @InjectRepository(UserSettings)
    private readonly userSettingsRepository: Repository<UserSettings>,
    @InjectRepository(SettingsView)
    private readonly settingsViewRepository: Repository<SettingsView>,
  ) {}

  async getConfig(
    userId: number,
    view: string,
    deviceType: string,
  ): Promise<Record<string, unknown> | null> {
    const knownView = this.requireKnownView(view);
    const knownDevice = this.requireKnownDeviceType(deviceType);
    const viewId = await this.resolveViewId(knownView);
    const row = await this.userSettingsRepository.findOne({
      where: { userId, viewId, deviceType: knownDevice },
    });
    return row?.config ?? null;
  }

  async saveConfig(
    userId: number,
    view: string,
    config: unknown,
    deviceType: string,
  ): Promise<Record<string, unknown>> {
    const knownView = this.requireKnownView(view);
    const knownDevice = this.requireKnownDeviceType(deviceType);
    if (!isValidConfigForView(knownView, config)) {
      throw new BadRequestException('INVALID_CONFIG_FOR_VIEW');
    }

    const viewId = await this.resolveViewId(knownView);
    const row =
      (await this.userSettingsRepository.findOne({
        where: { userId, viewId, deviceType: knownDevice },
      })) ?? this.userSettingsRepository.create({ userId, viewId, deviceType: knownDevice });
    row.config = config as Record<string, unknown>;
    await this.userSettingsRepository.save(row);

    return row.config;
  }

  private requireKnownView(view: string): SettingsViewKey {
    if (!isKnownView(view)) {
      throw new BadRequestException('UNKNOWN_VIEW');
    }
    return view;
  }

  private requireKnownDeviceType(deviceType: string): DeviceType {
    if (!isKnownDeviceType(deviceType)) {
      throw new BadRequestException('UNKNOWN_DEVICE_TYPE');
    }
    return deviceType;
  }

  // `KNOWN_VIEWS` (user-settings.util.ts) es la lista pura/testeable de claves válidas;
  // `settings_views` es su contraparte relacional (catálogo con id numérico, ver
  // db/004-normalize-user-settings-row-per-view.sql). Si una clave conocida no tiene fila en el
  // catálogo (seed no corrido / desincronizado), se trata como config faltante — mismo criterio
  // "se degrada sin romper" que ya sigue el resto de este módulo.
  private async resolveViewId(view: SettingsViewKey): Promise<number> {
    const row = await this.settingsViewRepository.findOne({
      where: { viewKey: view },
    });
    if (!row) {
      throw new BadRequestException('VIEW_NOT_SEEDED');
    }
    return row.id;
  }
}

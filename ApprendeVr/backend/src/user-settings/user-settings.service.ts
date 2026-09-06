import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings } from './entities/user-settings.entity';
import {
  columnForView,
  isKnownView,
  isValidConfigForView,
  SettingsView,
} from './user-settings.util';

@Injectable()
export class UserSettingsService {
  constructor(
    @InjectRepository(UserSettings)
    private readonly userSettingsRepository: Repository<UserSettings>,
  ) {}

  async getConfig(
    userId: number,
    view: string,
  ): Promise<Record<string, unknown> | null> {
    const knownView = this.requireKnownView(view);
    const row = await this.userSettingsRepository.findOne({
      where: { userId },
    });
    return row?.[columnForView(knownView)] ?? null;
  }

  async saveConfig(
    userId: number,
    view: string,
    config: unknown,
  ): Promise<Record<string, unknown>> {
    const knownView = this.requireKnownView(view);
    if (!isValidConfigForView(knownView, config)) {
      throw new BadRequestException('INVALID_CONFIG_FOR_VIEW');
    }

    const column = columnForView(knownView);
    const row =
      (await this.userSettingsRepository.findOne({ where: { userId } })) ??
      this.userSettingsRepository.create({ userId });
    row[column] = config as Record<string, unknown>;
    await this.userSettingsRepository.save(row);

    return config as Record<string, unknown>;
  }

  private requireKnownView(view: string): SettingsView {
    if (!isKnownView(view)) {
      throw new BadRequestException('UNKNOWN_VIEW');
    }
    return view;
  }
}

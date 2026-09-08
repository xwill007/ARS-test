import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { SaveUserSettingDto } from './dto/save-user-setting.dto';
import { UserSettingsService } from './user-settings.service';

@Controller('user-settings')
@UseGuards(JwtAuthGuard)
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get(':view')
  getConfig(
    @Param('view') view: string,
    // `?device=web|mobile` (Requerimiento 012, ampliación) — sin el parámetro se asume 'web',
    // mismo default que usan las filas guardadas antes de que existiera esta columna.
    @Query('device') device: string | undefined,
    @CurrentUser() user: User,
  ) {
    return this.userSettingsService.getConfig(user.id, view, device ?? 'web');
  }

  @Put(':view')
  saveConfig(
    @Param('view') view: string,
    @Query('device') device: string | undefined,
    @Body() dto: SaveUserSettingDto,
    @CurrentUser() user: User,
  ) {
    return this.userSettingsService.saveConfig(user.id, view, dto.config, device ?? 'web');
  }
}

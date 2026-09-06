import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
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
  getConfig(@Param('view') view: string, @CurrentUser() user: User) {
    return this.userSettingsService.getConfig(user.id, view);
  }

  @Put(':view')
  saveConfig(
    @Param('view') view: string,
    @Body() dto: SaveUserSettingDto,
    @CurrentUser() user: User,
  ) {
    return this.userSettingsService.saveConfig(user.id, view, dto.config);
  }
}

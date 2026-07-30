import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { NotificationSettingsService } from './notification-settings.service';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import { NotificationEvent } from './enums/notification-event.enum';

@ApiTags('settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('settings/notifications')
export class NotificationSettingsController {
  constructor(
    private readonly notificationSettingsService: NotificationSettingsService,
  ) {}

  @ApiOperation({
    summary:
      'List whether a customer email is sent on stream disable / restart / order expiry',
  })
  @Get()
  findAll() {
    return this.notificationSettingsService.findAll();
  }

  @ApiOperation({ summary: 'Enable/disable notifications for one event' })
  @Patch(':event')
  update(
    @Param('event') event: NotificationEvent,
    @Body() dto: UpdateNotificationSettingDto,
  ) {
    return this.notificationSettingsService.update(event, dto);
  }
}

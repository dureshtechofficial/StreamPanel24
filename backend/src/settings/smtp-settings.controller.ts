import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { SmtpSettingsService } from './smtp-settings.service';
import { UpdateSmtpSettingDto } from './dto/update-smtp-setting.dto';
import { TestSmtpSettingDto } from './dto/test-smtp-setting.dto';

@ApiTags('settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('settings/smtp')
export class SmtpSettingsController {
  constructor(private readonly smtpSettingsService: SmtpSettingsService) {}

  @ApiOperation({ summary: 'Get the outbound email / SMTP configuration' })
  @Get()
  get() {
    return this.smtpSettingsService.get();
  }

  @ApiOperation({ summary: 'Update the outbound email / SMTP configuration' })
  @Patch()
  update(@Body() dto: UpdateSmtpSettingDto) {
    return this.smtpSettingsService.update(dto);
  }

  @ApiOperation({
    summary: 'Send a test email using the stored SMTP configuration',
  })
  @Post('test')
  sendTest(@Body() dto: TestSmtpSettingDto) {
    return this.smtpSettingsService.sendTest(dto);
  }
}

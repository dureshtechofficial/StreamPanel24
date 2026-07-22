import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { WalletTopupSettingsService } from './wallet-topup-settings.service';
import { UpdateWalletTopupSettingDto } from './dto/update-wallet-topup-setting.dto';
import { WalletTopupActor } from './enums/wallet-topup-actor.enum';

@ApiTags('settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('settings/wallet-topup')
export class WalletTopupSettingsController {
  constructor(
    private readonly walletTopupSettingsService: WalletTopupSettingsService,
  ) {}

  @ApiOperation({
    summary:
      'List whether reseller/customer self-service wallet top-up is enabled, and each minimum amount',
  })
  @Get()
  findAll() {
    return this.walletTopupSettingsService.findAll();
  }

  @ApiOperation({
    summary:
      'Enable/disable wallet top-up (and/or change its minimum amount) for one actor type',
  })
  @Patch(':actorType')
  update(
    @Param('actorType') actorType: WalletTopupActor,
    @Body() dto: UpdateWalletTopupSettingDto,
  ) {
    return this.walletTopupSettingsService.update(actorType, dto);
  }
}

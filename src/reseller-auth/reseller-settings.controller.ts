import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResellerJwtAccessGuard } from './guards/reseller-jwt-access.guard';
import { OrderCancelSettingsService } from '../settings/order-cancel-settings.service';
import { OrderCancelActor } from '../settings/enums/order-cancel-actor.enum';

@ApiTags('reseller-auth')
@ApiBearerAuth('access-token')
@UseGuards(ResellerJwtAccessGuard)
@Controller('reseller-auth/settings')
export class ResellerSettingsController {
  constructor(
    private readonly orderCancelSettingsService: OrderCancelSettingsService,
  ) {}

  @ApiOperation({
    summary: 'Whether resellers are currently allowed to cancel an order',
  })
  @Get('order-cancel-enabled')
  async orderCancelEnabled() {
    const enabled = await this.orderCancelSettingsService.isCancelEnabled(
      OrderCancelActor.RESELLER,
    );
    return { enabled };
  }
}

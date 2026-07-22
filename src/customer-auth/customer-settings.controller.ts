import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerJwtAccessGuard } from './guards/customer-jwt-access.guard';
import { OrderCancelSettingsService } from '../settings/order-cancel-settings.service';
import { OrderCancelActor } from '../settings/enums/order-cancel-actor.enum';

@ApiTags('customer-auth')
@ApiBearerAuth('access-token')
@UseGuards(CustomerJwtAccessGuard)
@Controller('customer-auth/settings')
export class CustomerSettingsController {
  constructor(
    private readonly orderCancelSettingsService: OrderCancelSettingsService,
  ) {}

  @ApiOperation({
    summary: 'Whether customers are currently allowed to cancel an order',
  })
  @Get('order-cancel-enabled')
  async orderCancelEnabled() {
    const enabled = await this.orderCancelSettingsService.isCancelEnabled(
      OrderCancelActor.CUSTOMER,
    );
    return { enabled };
  }
}

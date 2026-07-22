import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResellerJwtAccessGuard } from './guards/reseller-jwt-access.guard';
import { OrderCancelSettingsService } from '../settings/order-cancel-settings.service';
import { OrderCancelActor } from '../settings/enums/order-cancel-actor.enum';
import { CustomerActionSettingsService } from '../settings/customer-action-settings.service';
import { CustomerActionActor } from '../settings/enums/customer-action-actor.enum';
import { CustomerAction } from '../settings/enums/customer-action.enum';

@ApiTags('reseller-auth')
@ApiBearerAuth('access-token')
@UseGuards(ResellerJwtAccessGuard)
@Controller('reseller-auth/settings')
export class ResellerSettingsController {
  constructor(
    private readonly orderCancelSettingsService: OrderCancelSettingsService,
    private readonly customerActionSettingsService: CustomerActionSettingsService,
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

  @ApiOperation({
    summary:
      'Whether resellers are currently allowed to edit/delete/assign-streams on a customer',
  })
  @Get('customer-actions')
  async customerActions() {
    const [edit, deleteAction, assign] = await Promise.all([
      this.customerActionSettingsService.isActionEnabled(
        CustomerActionActor.RESELLER,
        CustomerAction.EDIT,
      ),
      this.customerActionSettingsService.isActionEnabled(
        CustomerActionActor.RESELLER,
        CustomerAction.DELETE,
      ),
      this.customerActionSettingsService.isActionEnabled(
        CustomerActionActor.RESELLER,
        CustomerAction.ASSIGN,
      ),
    ]);
    return { edit, delete: deleteAction, assign };
  }
}

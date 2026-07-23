import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { OrderCancelSettingsService } from './order-cancel-settings.service';
import { UpdateOrderCancelSettingDto } from './dto/update-order-cancel-setting.dto';
import { OrderCancelActor } from './enums/order-cancel-actor.enum';

@ApiTags('settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('settings/order-cancel')
export class OrderCancelSettingsController {
  constructor(
    private readonly orderCancelSettingsService: OrderCancelSettingsService,
  ) {}

  @ApiOperation({
    summary:
      'List whether admin/reseller/customer are each currently allowed to cancel an order',
  })
  @Get()
  findAll() {
    return this.orderCancelSettingsService.findAll();
  }

  @ApiOperation({
    summary: 'Enable/disable order cancellation for one actor type',
  })
  @Patch(':actorType')
  update(
    @Param('actorType') actorType: OrderCancelActor,
    @Body() dto: UpdateOrderCancelSettingDto,
  ) {
    return this.orderCancelSettingsService.update(actorType, dto);
  }
}

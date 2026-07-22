import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CustomerActionSettingsService } from './customer-action-settings.service';
import { UpdateCustomerActionSettingDto } from './dto/update-customer-action-setting.dto';
import { CustomerActionActor } from './enums/customer-action-actor.enum';
import { CustomerAction } from './enums/customer-action.enum';

@ApiTags('settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('settings/customer-actions')
export class CustomerActionSettingsController {
  constructor(
    private readonly customerActionSettingsService: CustomerActionSettingsService,
  ) {}

  @ApiOperation({
    summary:
      'List whether admin/reseller are each currently allowed to edit/delete/assign-streams on a customer',
  })
  @Get()
  findAll() {
    return this.customerActionSettingsService.findAll();
  }

  @ApiOperation({
    summary: 'Enable/disable one customer action for one actor type',
  })
  @Patch(':actorType/:action')
  update(
    @Param('actorType') actorType: CustomerActionActor,
    @Param('action') action: CustomerAction,
    @Body() dto: UpdateCustomerActionSettingDto,
  ) {
    return this.customerActionSettingsService.update(actorType, action, dto);
  }
}

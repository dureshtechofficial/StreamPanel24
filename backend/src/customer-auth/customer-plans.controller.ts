import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerJwtAccessGuard } from './guards/customer-jwt-access.guard';
import { PlansService } from '../plans/plans.service';

@ApiTags('customer-auth')
@ApiBearerAuth('access-token')
@UseGuards(CustomerJwtAccessGuard)
@Controller('customer-auth/plans')
export class CustomerPlansController {
  constructor(private readonly plansService: PlansService) {}

  @ApiOperation({ summary: 'List active plans visible to customers' })
  @Get()
  findAll() {
    return this.plansService.findVisibleForCustomer();
  }
}

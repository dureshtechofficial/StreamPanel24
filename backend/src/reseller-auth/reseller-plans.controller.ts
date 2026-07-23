import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResellerJwtAccessGuard } from './guards/reseller-jwt-access.guard';
import { PlansService } from '../plans/plans.service';

@ApiTags('reseller-auth')
@ApiBearerAuth('access-token')
@UseGuards(ResellerJwtAccessGuard)
@Controller('reseller-auth/plans')
export class ResellerPlansController {
  constructor(private readonly plansService: PlansService) {}

  @ApiOperation({
    summary: 'List active plans visible to resellers, priced at reseller_price',
  })
  @Get()
  findAll() {
    return this.plansService.findVisibleForReseller();
  }
}

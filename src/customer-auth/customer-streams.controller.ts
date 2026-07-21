import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerJwtAccessGuard } from './guards/customer-jwt-access.guard';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { Customer } from '../customers/entities/customer.entity';
import { FlussonicStreamsService } from '../flussonic-servers/flussonic-streams.service';

@ApiTags('customer-auth')
@ApiBearerAuth('access-token')
@UseGuards(CustomerJwtAccessGuard)
@Controller('customer-auth/streams')
export class CustomerStreamsPortalController {
  constructor(private readonly streamsService: FlussonicStreamsService) {}

  @ApiOperation({
    summary:
      "List the current customer's own assigned streams — id always comes from the token, never a request param",
  })
  @Get()
  findMine(@CurrentCustomer() customer: Customer) {
    return this.streamsService.findAllForCustomer(customer.id);
  }
}

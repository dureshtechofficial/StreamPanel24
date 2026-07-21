import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CustomersService } from './customers.service';
import { FlussonicStreamsService } from '../flussonic-servers/flussonic-streams.service';
import { AssignCustomerStreamsDto } from './dto/assign-customer-streams.dto';

@ApiTags('customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('customers/:id/streams')
export class CustomerStreamsController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly streamsService: FlussonicStreamsService,
  ) {}

  @ApiOperation({ summary: "List a customer's assigned streams" })
  @Get()
  async findAll(@Param('id') id: string) {
    await this.customersService.findOne(id); // 404s if the customer doesn't exist or is soft-deleted
    return this.streamsService.findAllForCustomer(id);
  }

  @ApiOperation({
    summary:
      "Replace a customer's assigned streams with exactly this set — unassigns any not listed, assigns the rest",
  })
  @Put()
  async assign(@Param('id') id: string, @Body() dto: AssignCustomerStreamsDto) {
    await this.customersService.findOne(id);
    return this.streamsService.assignToCustomer(id, dto.streamIds);
  }
}

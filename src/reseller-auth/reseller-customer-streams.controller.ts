import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResellerJwtAccessGuard } from './guards/reseller-jwt-access.guard';
import { CurrentReseller } from './decorators/current-reseller.decorator';
import { Reseller } from '../resellers/entities/reseller.entity';
import { CustomersService } from '../customers/customers.service';
import { FlussonicStreamsService } from '../flussonic-servers/flussonic-streams.service';
import { AssignCustomerStreamsDto } from '../customers/dto/assign-customer-streams.dto';
import { QueryFlussonicStreamsDirectoryDto } from '../flussonic-servers/dto/query-flussonic-streams-directory.dto';

@ApiTags('reseller-auth')
@ApiBearerAuth('access-token')
@UseGuards(ResellerJwtAccessGuard)
@Controller('reseller-auth')
export class ResellerCustomerStreamsController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly streamsService: FlussonicStreamsService,
  ) {}

  @ApiOperation({
    summary:
      'Search streams across every server (paginated) — used by the reseller-portal customer stream-assignment picker',
  })
  @Get('streams')
  findAllStreams(@Query() query: QueryFlussonicStreamsDirectoryDto) {
    return this.streamsService.findAllAcrossServers(query);
  }

  @ApiOperation({
    summary: "List one of the reseller's customers' assigned streams",
  })
  @Get('customers/:customerId/streams')
  async findCustomerStreams(
    @CurrentReseller() reseller: Reseller,
    @Param('customerId') customerId: string,
  ) {
    await this.customersService.findOneForReseller(reseller.id, customerId); // 404s if not this reseller's customer
    return this.streamsService.findAllForCustomer(customerId);
  }

  @ApiOperation({
    summary:
      "Replace one of the reseller's customers' assigned streams with exactly this set",
  })
  @Put('customers/:customerId/streams')
  async assignCustomerStreams(
    @CurrentReseller() reseller: Reseller,
    @Param('customerId') customerId: string,
    @Body() dto: AssignCustomerStreamsDto,
  ) {
    await this.customersService.findOneForReseller(reseller.id, customerId);
    return this.streamsService.assignToCustomer(customerId, dto.streamIds);
  }
}

import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerJwtAccessGuard } from './guards/customer-jwt-access.guard';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { Customer } from '../customers/entities/customer.entity';
import { FlussonicStreamsService } from '../flussonic-servers/flussonic-streams.service';
import { FlussonicStreamSessionsService } from '../flussonic-servers/flussonic-stream-sessions.service';
import { FlussonicStream } from '../flussonic-servers/entities/flussonic-stream.entity';
import { QueryFlussonicStreamSessionDto } from '../flussonic-servers/dto/query-flussonic-stream-session.dto';
import { SetStreamDisabledDto } from '../flussonic-servers/dto/set-stream-disabled.dto';

@ApiTags('customer-auth')
@ApiBearerAuth('access-token')
@UseGuards(CustomerJwtAccessGuard)
@Controller('customer-auth/streams')
export class CustomerStreamsPortalController {
  constructor(
    private readonly streamsService: FlussonicStreamsService,
    private readonly sessionsService: FlussonicStreamSessionsService,
  ) {}

  @ApiOperation({
    summary:
      "List the current customer's own assigned streams — id always comes from the token, never a request param",
  })
  @Get()
  findMine(@CurrentCustomer() customer: Customer) {
    return this.streamsService.findAllForCustomer(customer.id);
  }

  @ApiOperation({
    summary:
      "Get one of the current customer's own streams' full details — 404s unless it's currently assigned to them",
  })
  @Get(':streamId')
  async findOneMine(
    @CurrentCustomer() customer: Customer,
    @Param('streamId') streamId: string,
  ) {
    return this.assertOwnedStream(customer, streamId);
  }

  @ApiOperation({
    summary:
      "Sessions for one of the current customer's own streams — 404s unless the stream is currently assigned to them",
  })
  @Get(':streamId/sessions')
  async findMineSessions(
    @CurrentCustomer() customer: Customer,
    @Param('streamId') streamId: string,
    @Query() query: QueryFlussonicStreamSessionDto,
  ) {
    await this.assertOwnedStream(customer, streamId);
    return this.sessionsService.findAllForStream(streamId, query);
  }

  @ApiOperation({
    summary:
      'Disable/re-enable one of the current customer\'s own streams (used for the "Disable"/"Restart" actions) — 404s unless it\'s currently assigned to them',
  })
  @Patch(':streamId/disabled')
  async setStreamDisabled(
    @CurrentCustomer() customer: Customer,
    @Param('streamId') streamId: string,
    @Body() dto: SetStreamDisabledDto,
  ) {
    const stream = await this.assertOwnedStream(customer, streamId);
    return this.streamsService.update(stream.flussonic_server_id, streamId, {
      disabled: dto.disabled,
    });
  }

  /** 404s unless `streamId` is currently assigned to this customer. */
  private async assertOwnedStream(
    customer: Customer,
    streamId: string,
  ): Promise<FlussonicStream> {
    const stream = await this.streamsService.findOneById(streamId);
    if (!stream || stream.customer_id !== customer.id) {
      throw new NotFoundException('Stream not found');
    }
    return stream;
  }
}

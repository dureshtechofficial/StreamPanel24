import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
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
import { FlussonicStreamSessionsService } from '../flussonic-servers/flussonic-stream-sessions.service';
import { FlussonicStream } from '../flussonic-servers/entities/flussonic-stream.entity';
import { AssignCustomerStreamsDto } from '../customers/dto/assign-customer-streams.dto';
import { QueryFlussonicStreamsDirectoryDto } from '../flussonic-servers/dto/query-flussonic-streams-directory.dto';
import { QueryFlussonicStreamSessionDto } from '../flussonic-servers/dto/query-flussonic-stream-session.dto';
import { SetStreamDisabledDto } from '../flussonic-servers/dto/set-stream-disabled.dto';
import { CustomerActionSettingsService } from '../settings/customer-action-settings.service';
import { CustomerActionActor } from '../settings/enums/customer-action-actor.enum';
import { CustomerAction } from '../settings/enums/customer-action.enum';

@ApiTags('reseller-auth')
@ApiBearerAuth('access-token')
@UseGuards(ResellerJwtAccessGuard)
@Controller('reseller-auth')
export class ResellerCustomerStreamsController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly streamsService: FlussonicStreamsService,
    private readonly sessionsService: FlussonicStreamSessionsService,
    private readonly customerActionSettingsService: CustomerActionSettingsService,
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
    await this.customerActionSettingsService.assertActionEnabled(
      CustomerActionActor.RESELLER,
      CustomerAction.ASSIGN,
    );
    await this.customersService.findOneForReseller(reseller.id, customerId);
    return this.streamsService.assignToCustomer(customerId, dto.streamIds);
  }

  @ApiOperation({
    summary:
      "Get one stream's full details — 404s unless it's currently assigned to one of the reseller's own customers",
  })
  @Get('streams/:streamId')
  async findOneStream(
    @CurrentReseller() reseller: Reseller,
    @Param('streamId') streamId: string,
  ) {
    return this.assertOwnedStream(reseller, streamId);
  }

  @ApiOperation({
    summary:
      "Sessions for one stream — 404s unless the stream is currently assigned to one of the reseller's own customers",
  })
  @Get('streams/:streamId/sessions')
  async findStreamSessions(
    @CurrentReseller() reseller: Reseller,
    @Param('streamId') streamId: string,
    @Query() query: QueryFlussonicStreamSessionDto,
  ) {
    await this.assertOwnedStream(reseller, streamId);
    return this.sessionsService.findAllForStream(streamId, query);
  }

  @ApiOperation({
    summary:
      'Disable/re-enable one stream (used for the "Disable"/"Restart" actions) — 404s unless it\'s currently assigned to one of the reseller\'s own customers',
  })
  @Patch('streams/:streamId/disabled')
  async setStreamDisabled(
    @CurrentReseller() reseller: Reseller,
    @Param('streamId') streamId: string,
    @Body() dto: SetStreamDisabledDto,
  ) {
    const stream = await this.assertOwnedStream(reseller, streamId);
    return this.streamsService.update(stream.flussonic_server_id, streamId, {
      disabled: dto.disabled,
    });
  }

  @ApiOperation({
    summary:
      "Restart one stream (disable then re-enable, forcing a reconnect) — 404s unless it's currently assigned to one of the reseller's own customers",
  })
  @Post('streams/:streamId/restart')
  @HttpCode(HttpStatus.OK)
  async restartStream(
    @CurrentReseller() reseller: Reseller,
    @Param('streamId') streamId: string,
  ) {
    const stream = await this.assertOwnedStream(reseller, streamId);
    return this.streamsService.restart(stream.flussonic_server_id, streamId);
  }

  /** 404s unless `streamId` is currently assigned to one of this reseller's own customers. */
  private async assertOwnedStream(
    reseller: Reseller,
    streamId: string,
  ): Promise<FlussonicStream> {
    const stream = await this.streamsService.findOneById(streamId);
    if (!stream || !stream.customer_id) {
      throw new NotFoundException('Stream not found');
    }
    await this.customersService.findOneForReseller(
      reseller.id,
      stream.customer_id,
    );
    return stream;
  }
}

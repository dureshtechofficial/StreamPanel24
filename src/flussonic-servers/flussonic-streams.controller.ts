import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { FlussonicStreamsService } from './flussonic-streams.service';
import { CreateFlussonicStreamDto } from './dto/create-flussonic-stream.dto';
import { UpdateFlussonicStreamDto } from './dto/update-flussonic-stream.dto';
import { QueryFlussonicStreamDto } from './dto/query-flussonic-stream.dto';

@ApiTags('flussonic-streams')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('flussonic-servers/:serverId/streams')
export class FlussonicStreamsController {
  constructor(private readonly streamsService: FlussonicStreamsService) {}

  @ApiOperation({
    summary:
      "List a server's streams (paginated, searchable, filterable by status)",
  })
  @Get()
  findAll(
    @Param('serverId') serverId: string,
    @Query() query: QueryFlussonicStreamDto,
  ) {
    return this.streamsService.findAllForServer(serverId, query);
  }

  @ApiOperation({
    summary:
      'Check whether a stream name is already taken, in our DB or on the live Flussonic server',
  })
  @Get('check-name')
  checkName(@Param('serverId') serverId: string, @Query('name') name: string) {
    return this.streamsService.checkNameExists(serverId, name);
  }

  @ApiOperation({
    summary:
      "Sync with the server's real GET streams endpoint — refreshes live_stats_json for known streams and imports any found on the server but missing locally",
  })
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  sync(@Param('serverId') serverId: string) {
    return this.streamsService.syncFromFlussonic(serverId);
  }

  @ApiOperation({ summary: 'Get one stream' })
  @Get(':id')
  findOne(@Param('serverId') serverId: string, @Param('id') id: string) {
    return this.streamsService.findOneForServer(serverId, id);
  }

  @ApiOperation({
    summary:
      'Create a stream (PUT /streams/urlencode(name) on the real Flussonic server, then cached locally)',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('serverId') serverId: string,
    @Body() dto: CreateFlussonicStreamDto,
  ) {
    return this.streamsService.create(serverId, dto);
  }

  @ApiOperation({
    summary:
      'Update a stream (re-PUTs the merged config to Flussonic; renaming PUTs the new name then deletes the old one)',
  })
  @Patch(':id')
  update(
    @Param('serverId') serverId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFlussonicStreamDto,
  ) {
    return this.streamsService.update(serverId, id, dto);
  }

  @ApiOperation({
    summary:
      'Delete a stream from Flussonic and soft-delete it locally (sets status to "deleted", never removes the row)',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('serverId') serverId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.streamsService.remove(serverId, id);
  }
}

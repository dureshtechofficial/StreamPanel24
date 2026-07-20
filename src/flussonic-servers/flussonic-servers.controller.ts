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
import { FlussonicServersService } from './flussonic-servers.service';
import { FlussonicServerStatsService } from './flussonic-server-stats.service';
import { CreateFlussonicServerDto } from './dto/create-flussonic-server.dto';
import { UpdateFlussonicServerDto } from './dto/update-flussonic-server.dto';
import { QueryFlussonicServerDto } from './dto/query-flussonic-server.dto';

@ApiTags('flussonic-servers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('flussonic-servers')
export class FlussonicServersController {
  constructor(
    private readonly serversService: FlussonicServersService,
    private readonly statsService: FlussonicServerStatsService,
  ) {}

  @ApiOperation({ summary: 'List Flussonic servers (admin only)' })
  @Get()
  findAll(@Query() query: QueryFlussonicServerDto) {
    return this.serversService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one Flussonic server' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serversService.findOne(id);
  }

  @ApiOperation({
    summary:
      'Register a server. api_access_token is derived from username/password, not accepted here.',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFlussonicServerDto) {
    return this.serversService.create(dto);
  }

  @ApiOperation({
    summary:
      'Sync every non-deleted server; one failure does not abort the rest',
  })
  @Post('sync-all')
  syncAll() {
    return this.statsService.syncAll();
  }

  @ApiOperation({ summary: 'Update a server' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFlussonicServerDto) {
    return this.serversService.update(id, dto);
  }

  @ApiOperation({
    summary:
      'Soft-delete a server (sets status to "deleted", never removes the row)',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.serversService.remove(id);
  }
}

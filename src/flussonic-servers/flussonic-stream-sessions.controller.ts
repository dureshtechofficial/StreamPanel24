import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { FlussonicStreamSessionsService } from './flussonic-stream-sessions.service';
import { QueryFlussonicStreamSessionDto } from './dto/query-flussonic-stream-session.dto';

@ApiTags('flussonic-stream-sessions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('flussonic-servers/:serverId/sessions')
export class FlussonicStreamSessionsController {
  constructor(
    private readonly sessionsService: FlussonicStreamSessionsService,
  ) {}

  @ApiOperation({
    summary:
      "List a server's stream sessions (paginated, newest-updated first)",
  })
  @Get()
  findAll(
    @Param('serverId') serverId: string,
    @Query() query: QueryFlussonicStreamSessionDto,
  ) {
    return this.sessionsService.findAllForServer(serverId, query);
  }

  @ApiOperation({
    summary:
      'Sync with the real GET sessions endpoint — upserts every current session by its Flussonic session id, enriching new ones via ipwho.is',
  })
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  sync(@Param('serverId') serverId: string) {
    return this.sessionsService.syncFromFlussonic(serverId);
  }
}

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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
      "List a server's current stream sessions — fetched live from the real GET sessions endpoint on each request, never stored (paginated, newest-updated first)",
  })
  @Get()
  findAll(
    @Param('serverId') serverId: string,
    @Query() query: QueryFlussonicStreamSessionDto,
  ) {
    return this.sessionsService.findAllForServer(serverId, query);
  }
}

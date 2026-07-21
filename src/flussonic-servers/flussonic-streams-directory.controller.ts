import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { FlussonicStreamsService } from './flussonic-streams.service';
import { QueryFlussonicStreamsDirectoryDto } from './dto/query-flussonic-streams-directory.dto';

@ApiTags('flussonic-streams')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('flussonic-streams')
export class FlussonicStreamsDirectoryController {
  constructor(private readonly streamsService: FlussonicStreamsService) {}

  @ApiOperation({
    summary:
      'Search streams across every server (paginated) — used by the customer stream-assignment picker',
  })
  @Get()
  findAll(@Query() query: QueryFlussonicStreamsDirectoryDto) {
    return this.streamsService.findAllAcrossServers(query);
  }
}

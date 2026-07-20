import {
  Body,
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
import { FlussonicServerStatsService } from './flussonic-server-stats.service';
import { CreateFlussonicServerStatDto } from './dto/create-flussonic-server-stat.dto';
import { QueryFlussonicServerStatDto } from './dto/query-flussonic-server-stat.dto';

@ApiTags('flussonic-server-stats')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('flussonic-servers/:serverId/stats')
export class FlussonicServerStatsController {
  constructor(private readonly statsService: FlussonicServerStatsService) {}

  @ApiOperation({
    summary: "List a server's recorded stats samples (paginated, newest first)",
  })
  @Get()
  findAll(
    @Param('serverId') serverId: string,
    @Query() query: QueryFlussonicServerStatDto,
  ) {
    return this.statsService.findAllForServer(serverId, query);
  }

  @ApiOperation({ summary: 'Manually record a stats sample' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('serverId') serverId: string,
    @Body() dto: CreateFlussonicServerStatDto,
  ) {
    return this.statsService.create(serverId, dto);
  }

  @ApiOperation({
    summary:
      "Fetch the server's real config/stats endpoint and record the result as a new sample",
  })
  @Post('sync')
  @HttpCode(HttpStatus.CREATED)
  sync(@Param('serverId') serverId: string) {
    return this.statsService.sync(serverId);
  }
}

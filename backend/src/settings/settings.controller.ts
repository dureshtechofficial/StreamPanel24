import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { SyncScheduleService } from './sync-schedule.service';
import { UpdateSyncScheduleDto } from './dto/update-sync-schedule.dto';
import { QuerySyncScheduleRunDto } from './dto/query-sync-schedule-run.dto';
import { SyncType } from './enums/sync-type.enum';

@ApiTags('settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('settings/sync-schedules')
export class SettingsController {
  constructor(private readonly syncScheduleService: SyncScheduleService) {}

  @ApiOperation({
    summary:
      'List the cron schedule for each sync type (server stats, streams, order expiry)',
  })
  @Get()
  findAll() {
    return this.syncScheduleService.findAll();
  }

  @ApiOperation({
    summary:
      'Enable/disable or change the cron expression for one sync type; takes effect immediately',
  })
  @Patch(':type')
  update(@Param('type') type: SyncType, @Body() dto: UpdateSyncScheduleDto) {
    return this.syncScheduleService.update(type, dto);
  }

  @ApiOperation({
    summary:
      'Paginated run history for one sync type, newest first — every cron firing, not just the latest',
  })
  @Get(':type/runs')
  findRuns(
    @Param('type') type: SyncType,
    @Query() query: QuerySyncScheduleRunDto,
  ) {
    return this.syncScheduleService.findRuns(type, query);
  }
}

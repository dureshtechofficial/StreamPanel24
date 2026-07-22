import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncSchedule } from '../settings/entities/sync-schedule.entity';
import { SyncType } from '../settings/enums/sync-type.enum';

/**
 * Reads `sync_schedules.manual_sync_enabled` directly via its own repository
 * rather than going through SettingsModule's SyncScheduleService — that
 * service (and SettingsModule) already depends on this module for the
 * actual sync services, so importing it back here would be a circular
 * module dependency. This is the one place in this module allowed to touch
 * a "foreign" entity directly, specifically to avoid that cycle.
 */
@Injectable()
export class SyncScheduleGateService {
  constructor(
    @InjectRepository(SyncSchedule)
    private readonly scheduleRepository: Repository<SyncSchedule>,
  ) {}

  async isManualSyncEnabled(type: SyncType): Promise<boolean> {
    const schedule = await this.scheduleRepository.findOne({
      where: { sync_type: type },
    });
    // No row (shouldn't happen outside tests/fresh DBs) defaults to enabled,
    // so a missing settings row never silently blocks manual syncing.
    return schedule?.manual_sync_enabled ?? true;
  }

  async assertManualSyncEnabled(type: SyncType): Promise<void> {
    if (!(await this.isManualSyncEnabled(type))) {
      throw new ForbiddenException(
        `Manual ${type} sync is currently disabled by an administrator`,
      );
    }
  }
}

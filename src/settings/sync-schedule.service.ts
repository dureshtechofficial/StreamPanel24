import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Repository } from 'typeorm';
import { SyncSchedule } from './entities/sync-schedule.entity';
import { SyncScheduleRun } from './entities/sync-schedule-run.entity';
import { SyncType } from './enums/sync-type.enum';
import { UpdateSyncScheduleDto } from './dto/update-sync-schedule.dto';
import { QuerySyncScheduleRunDto } from './dto/query-sync-schedule-run.dto';
import { FlussonicServerStatsService } from '../flussonic-servers/flussonic-server-stats.service';
import { FlussonicStreamsService } from '../flussonic-servers/flussonic-streams.service';
import { FlussonicStreamSessionsService } from '../flussonic-servers/flussonic-stream-sessions.service';
import { nowUnixSeconds } from '../common/utils/unix-timestamp.util';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';

const JOB_PREFIX = 'sync-schedule-';

/**
 * One admin-configurable cron schedule per `SyncType`, applied to every
 * non-deleted server when it fires. Persisted settings are the source of
 * truth; `SchedulerRegistry`'s in-memory cron jobs are just a reflection of
 * them, rebuilt on boot and whenever a schedule is updated.
 */
@Injectable()
export class SyncScheduleService implements OnModuleInit {
  constructor(
    @InjectRepository(SyncSchedule)
    private readonly scheduleRepository: Repository<SyncSchedule>,
    @InjectRepository(SyncScheduleRun)
    private readonly runRepository: Repository<SyncScheduleRun>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly statsService: FlussonicServerStatsService,
    private readonly streamsService: FlussonicStreamsService,
    private readonly sessionsService: FlussonicStreamSessionsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const schedules = await this.scheduleRepository.find();
    for (const schedule of schedules) {
      this.applySchedule(schedule);
    }
  }

  async findAll(): Promise<SyncSchedule[]> {
    return this.scheduleRepository.find({ order: { sync_type: 'ASC' } });
  }

  async findRuns(
    type: SyncType,
    query: QuerySyncScheduleRunDto,
  ): Promise<PaginatedResult<SyncScheduleRun>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.runRepository.findAndCount({
      where: { sync_type: type },
      order: { ran_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async update(
    type: SyncType,
    dto: UpdateSyncScheduleDto,
  ): Promise<SyncSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { sync_type: type },
    });
    if (!schedule) {
      throw new NotFoundException(`No schedule found for sync type "${type}"`);
    }

    if (dto.cron_expression !== undefined) {
      this.assertValidCron(dto.cron_expression);
      schedule.cron_expression = dto.cron_expression;
    }
    if (dto.enabled !== undefined) {
      schedule.enabled = dto.enabled;
    }
    if (dto.manual_sync_enabled !== undefined) {
      schedule.manual_sync_enabled = dto.manual_sync_enabled;
    }

    await this.scheduleRepository.save(schedule);
    this.applySchedule(schedule);
    return schedule;
  }

  private assertValidCron(expression: string): void {
    try {
      new CronJob(expression, () => {});
    } catch (err) {
      throw new BadRequestException(
        `Invalid cron expression "${expression}": ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    }
  }

  /** (Re)registers this schedule's job in the SchedulerRegistry, or removes it if disabled. */
  private applySchedule(schedule: SyncSchedule): void {
    const name = JOB_PREFIX + schedule.sync_type;
    if (this.schedulerRegistry.doesExist('cron', name)) {
      this.schedulerRegistry.deleteCronJob(name);
    }
    if (!schedule.enabled) return;

    const job = new CronJob(schedule.cron_expression, () => {
      void this.runJob(schedule.sync_type);
    });
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }

  private async runJob(type: SyncType): Promise<void> {
    let summary: unknown;
    let success = true;
    try {
      if (type === SyncType.SERVER_STATS) {
        summary = await this.statsService.syncAll();
      } else if (type === SyncType.STREAMS) {
        summary = await this.streamsService.syncAllServers();
      } else {
        summary = await this.sessionsService.syncAllServers();
      }
    } catch (err) {
      success = false;
      summary = { error: err instanceof Error ? err.message : 'unknown error' };
    }

    const ranAt = nowUnixSeconds();

    const run = this.runRepository.create({
      sync_type: type,
      ran_at: ranAt,
      success,
      summary: summary as Record<string, unknown>,
    });
    await this.runRepository.save(run);

    const schedule = await this.scheduleRepository.findOne({
      where: { sync_type: type },
    });
    if (!schedule) return;

    schedule.last_run_at = ranAt;
    schedule.last_run_summary = summary as Record<string, unknown>;
    await this.scheduleRepository.save(schedule);
  }
}

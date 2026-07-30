import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSetting } from './entities/notification-setting.entity';
import { NotificationEvent } from './enums/notification-event.enum';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';

@Injectable()
export class NotificationSettingsService {
  constructor(
    @InjectRepository(NotificationSetting)
    private readonly repository: Repository<NotificationSetting>,
  ) {}

  findAll(): Promise<NotificationSetting[]> {
    return this.repository.find({ order: { id: 'ASC' } });
  }

  async update(
    eventType: NotificationEvent,
    dto: UpdateNotificationSettingDto,
  ): Promise<NotificationSetting> {
    const setting = await this.repository.findOne({
      where: { event_type: eventType },
    });
    if (!setting) {
      throw new NotFoundException(
        `No notification setting found for event "${eventType}"`,
      );
    }
    setting.enabled = dto.enabled;
    return this.repository.save(setting);
  }

  /** A missing row (fresh/pre-migration DB) defaults to disabled — a notification is never sent unless explicitly turned on. */
  async isEnabled(eventType: NotificationEvent): Promise<boolean> {
    const setting = await this.repository.findOne({
      where: { event_type: eventType },
    });
    return setting?.enabled ?? false;
  }
}

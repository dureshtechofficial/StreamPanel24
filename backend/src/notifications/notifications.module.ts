import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationSetting } from './entities/notification-setting.entity';
import { SmtpSetting } from '../settings/entities/smtp-setting.entity';
import { Customer } from '../customers/entities/customer.entity';
import { MailerService } from './mailer.service';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationsService } from './notifications.service';
import { NotificationSettingsController } from './notification-settings.controller';
import { NotificationsController } from './notifications.controller';

/**
 * Standalone module — deliberately imports no other feature module, only
 * registers the entities it reads directly (`SmtpSetting` for outbound email,
 * `Customer` to resolve a recipient address). FlussonicServersModule and
 * SettingsModule both import this to fire notifications; if this imported
 * either of them back it would be a circular dependency.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationSetting,
      SmtpSetting,
      Customer,
    ]),
  ],
  controllers: [NotificationSettingsController, NotificationsController],
  providers: [MailerService, NotificationSettingsService, NotificationsService],
  exports: [NotificationsService, NotificationSettingsService],
})
export class NotificationsModule {}

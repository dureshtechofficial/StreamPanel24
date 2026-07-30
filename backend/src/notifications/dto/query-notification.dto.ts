import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { NotificationEvent } from '../enums/notification-event.enum';

export class QueryNotificationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  /** Optionally filter the log to a single event type. */
  @IsOptional()
  @IsEnum(NotificationEvent)
  event_type?: NotificationEvent;
}

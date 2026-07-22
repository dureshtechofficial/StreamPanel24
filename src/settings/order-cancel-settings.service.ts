import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderCancelSetting } from './entities/order-cancel-setting.entity';
import { OrderCancelActor } from './enums/order-cancel-actor.enum';
import { UpdateOrderCancelSettingDto } from './dto/update-order-cancel-setting.dto';

@Injectable()
export class OrderCancelSettingsService {
  constructor(
    @InjectRepository(OrderCancelSetting)
    private readonly repository: Repository<OrderCancelSetting>,
  ) {}

  findAll(): Promise<OrderCancelSetting[]> {
    return this.repository.find({ order: { actor_type: 'ASC' } });
  }

  async update(
    actorType: OrderCancelActor,
    dto: UpdateOrderCancelSettingDto,
  ): Promise<OrderCancelSetting> {
    const setting = await this.repository.findOne({
      where: { actor_type: actorType },
    });
    if (!setting) {
      throw new NotFoundException(
        `No order-cancel setting found for actor "${actorType}"`,
      );
    }
    setting.enabled = dto.enabled;
    return this.repository.save(setting);
  }

  async isCancelEnabled(actorType: OrderCancelActor): Promise<boolean> {
    const setting = await this.repository.findOne({
      where: { actor_type: actorType },
    });
    // No row (shouldn't happen outside tests/fresh DBs) defaults to enabled,
    // so a missing settings row never silently blocks cancellation.
    return setting?.enabled ?? true;
  }

  async assertCancelEnabled(actorType: OrderCancelActor): Promise<void> {
    if (!(await this.isCancelEnabled(actorType))) {
      throw new ForbiddenException(
        `Order cancellation is currently disabled for ${actorType}s by an administrator`,
      );
    }
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerActionSetting } from './entities/customer-action-setting.entity';
import { CustomerActionActor } from './enums/customer-action-actor.enum';
import { CustomerAction } from './enums/customer-action.enum';
import { UpdateCustomerActionSettingDto } from './dto/update-customer-action-setting.dto';

@Injectable()
export class CustomerActionSettingsService {
  constructor(
    @InjectRepository(CustomerActionSetting)
    private readonly repository: Repository<CustomerActionSetting>,
  ) {}

  findAll(): Promise<CustomerActionSetting[]> {
    return this.repository.find({
      order: { actor_type: 'ASC', action: 'ASC' },
    });
  }

  async update(
    actorType: CustomerActionActor,
    action: CustomerAction,
    dto: UpdateCustomerActionSettingDto,
  ): Promise<CustomerActionSetting> {
    const setting = await this.repository.findOne({
      where: { actor_type: actorType, action },
    });
    if (!setting) {
      throw new NotFoundException(
        `No customer-action setting found for "${actorType}"/"${action}"`,
      );
    }
    setting.enabled = dto.enabled;
    return this.repository.save(setting);
  }

  async isActionEnabled(
    actorType: CustomerActionActor,
    action: CustomerAction,
  ): Promise<boolean> {
    const setting = await this.repository.findOne({
      where: { actor_type: actorType, action },
    });
    // No row (shouldn't happen outside tests/fresh DBs) defaults to enabled,
    // so a missing settings row never silently blocks the action.
    return setting?.enabled ?? true;
  }

  async assertActionEnabled(
    actorType: CustomerActionActor,
    action: CustomerAction,
  ): Promise<void> {
    if (!(await this.isActionEnabled(actorType, action))) {
      throw new ForbiddenException(
        `Customer ${action} is currently disabled for ${actorType}s by an administrator`,
      );
    }
  }
}

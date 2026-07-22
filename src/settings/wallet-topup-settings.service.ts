import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletTopupSetting } from './entities/wallet-topup-setting.entity';
import { WalletTopupActor } from './enums/wallet-topup-actor.enum';
import { UpdateWalletTopupSettingDto } from './dto/update-wallet-topup-setting.dto';

@Injectable()
export class WalletTopupSettingsService {
  constructor(
    @InjectRepository(WalletTopupSetting)
    private readonly repository: Repository<WalletTopupSetting>,
  ) {}

  findAll(): Promise<WalletTopupSetting[]> {
    return this.repository.find({ order: { actor_type: 'ASC' } });
  }

  async update(
    actorType: WalletTopupActor,
    dto: UpdateWalletTopupSettingDto,
  ): Promise<WalletTopupSetting> {
    const setting = await this.repository.findOne({
      where: { actor_type: actorType },
    });
    if (!setting) {
      throw new NotFoundException(
        `No wallet-topup setting found for actor "${actorType}"`,
      );
    }
    if (dto.enabled !== undefined) setting.enabled = dto.enabled;
    if (dto.minimum_amount !== undefined) {
      setting.minimum_amount = dto.minimum_amount.toFixed(2);
    }
    return this.repository.save(setting);
  }

  private async find(
    actorType: WalletTopupActor,
  ): Promise<WalletTopupSetting | null> {
    return this.repository.findOne({ where: { actor_type: actorType } });
  }

  /** A missing row (shouldn't happen outside a fresh/pre-migration DB) defaults to disabled — a new capability like this must never silently turn itself on. */
  async isEnabled(actorType: WalletTopupActor): Promise<boolean> {
    const setting = await this.find(actorType);
    return setting?.enabled ?? false;
  }

  async getMinimumAmount(actorType: WalletTopupActor): Promise<number> {
    const setting = await this.find(actorType);
    return Number(setting?.minimum_amount ?? '100.00');
  }

  /** Throws if top-up is disabled for this actor, or if `amount` is below the configured minimum. */
  async assertToppable(
    actorType: WalletTopupActor,
    amount: number,
  ): Promise<void> {
    const setting = await this.find(actorType);
    if (!setting?.enabled) {
      throw new BadRequestException(
        `Wallet top-up is currently disabled for ${actorType}s by an administrator`,
      );
    }
    const minimum = Number(setting.minimum_amount);
    if (amount < minimum) {
      throw new BadRequestException(
        `Minimum top-up amount is ${minimum.toFixed(2)}`,
      );
    }
  }
}

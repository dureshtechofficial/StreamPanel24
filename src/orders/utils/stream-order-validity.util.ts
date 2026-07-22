import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { FlussonicStreamsService } from '../../flussonic-servers/flussonic-streams.service';

/**
 * `status = 'active'` alone doesn't mean a stream should be live right now —
 * a queued renewal is active immediately even though its window hasn't
 * started yet (see OrdersService.resolveEffectiveFrom). This is the one
 * shared check for "does this stream currently have an order actually
 * inside its date window," used to decide whether Flussonic's `disabled`
 * flag should be off.
 */
export async function streamHasValidActiveOrder(
  ordersRepository: Repository<Order>,
  streamId: string,
  now: number,
): Promise<boolean> {
  const count = await ordersRepository
    .createQueryBuilder('order')
    .where('order.stream_id = :streamId', { streamId })
    .andWhere('order.status = :active', { active: OrderStatus.ACTIVE })
    .andWhere('order.effective_from <= :now', { now })
    .andWhere('order.effective_to > :now', { now })
    .getCount();
  return count > 0;
}

/**
 * Flips Flussonic's `disabled` flag (a real PUT) to match order validity —
 * only calls out when the current state actually differs, so an order
 * create/cancel/expiry sweep that doesn't change anything skips the round
 * trip. Returns whether it actually changed anything, for caller summaries.
 */
export async function syncStreamDisabledState(
  streamsService: FlussonicStreamsService,
  streamId: string,
  shouldBeEnabled: boolean,
): Promise<boolean> {
  const stream = await streamsService.findOneById(streamId);
  if (!stream) return false;

  const currentlyDisabled = Boolean(stream.config_json.disabled);
  if (currentlyDisabled === !shouldBeEnabled) return false;

  await streamsService.update(stream.flussonic_server_id, stream.id, {
    disabled: !shouldBeEnabled,
  });
  return true;
}

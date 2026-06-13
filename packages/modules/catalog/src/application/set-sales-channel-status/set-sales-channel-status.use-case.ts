import { err, ok, Result, UseCase } from '@mitama/core';
import { SalesChannelNotFoundError } from '../../domain/errors';
import type { SalesChannelRepository } from '../../domain/sales-channel.repository';
import { toSalesChannelOutput, type SalesChannelOutput } from '../sales-channel.dto';

export interface SetSalesChannelStatusInput {
  id: string;
  isActive: boolean;
  actorUserId: string | null;
}

export class SetSalesChannelStatusUseCase
  implements UseCase<SetSalesChannelStatusInput, Result<SalesChannelOutput, SalesChannelNotFoundError>>
{
  constructor(private readonly channels: SalesChannelRepository) {}

  async execute(input: SetSalesChannelStatusInput): Promise<Result<SalesChannelOutput, SalesChannelNotFoundError>> {
    const channel = await this.channels.findById(input.id);
    if (!channel) {
      return err(new SalesChannelNotFoundError(input.id));
    }

    channel.setActive(input.isActive);

    await this.channels.update(channel, {
      userId: input.actorUserId,
      storeId: null,
      action: input.isActive ? 'sales-channel.activated' : 'sales-channel.deactivated',
      entityType: 'sales_channel',
      entityId: channel.id,
      diff: { isActive: channel.isActive },
    });

    return ok(toSalesChannelOutput(channel));
  }
}

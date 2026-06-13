import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { SalesChannel } from '../../domain/sales-channel.entity';
import type { SalesChannelRepository } from '../../domain/sales-channel.repository';
import { toSalesChannelOutput, type SalesChannelOutput } from '../sales-channel.dto';
import type { CreateSalesChannelInput } from './create-sales-channel.dto';

export class CreateSalesChannelUseCase
  implements UseCase<CreateSalesChannelInput, Result<SalesChannelOutput, ValidationError>>
{
  constructor(private readonly channels: SalesChannelRepository) {}

  async execute(input: CreateSalesChannelInput): Promise<Result<SalesChannelOutput, ValidationError>> {
    const name = input.name.trim();
    if (!name) {
      return err(new ValidationError('El nombre del canal de venta es obligatorio'));
    }

    const channel = SalesChannel.create({ name, description: input.description ?? null });

    await this.channels.create(channel, {
      userId: input.actorUserId,
      storeId: null,
      action: 'sales-channel.created',
      entityType: 'sales_channel',
      entityId: channel.id,
      diff: { name: channel.name },
    });

    return ok(toSalesChannelOutput(channel));
  }
}

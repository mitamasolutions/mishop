import { err, ok, Result, UseCase, ValidationError } from '@mitama/core';
import { SalesChannelNotFoundError } from '../../domain/errors';
import type { SalesChannelRepository } from '../../domain/sales-channel.repository';
import { toSalesChannelOutput, type SalesChannelOutput } from '../sales-channel.dto';
import type { UpdateSalesChannelInput } from './update-sales-channel.dto';

export type UpdateSalesChannelError = ValidationError | SalesChannelNotFoundError;

export class UpdateSalesChannelUseCase
  implements UseCase<UpdateSalesChannelInput, Result<SalesChannelOutput, UpdateSalesChannelError>>
{
  constructor(private readonly channels: SalesChannelRepository) {}

  async execute(input: UpdateSalesChannelInput): Promise<Result<SalesChannelOutput, UpdateSalesChannelError>> {
    const channel = await this.channels.findById(input.id);
    if (!channel) {
      return err(new SalesChannelNotFoundError(input.id));
    }

    if (input.name !== undefined && !input.name.trim()) {
      return err(new ValidationError('El nombre del canal de venta es obligatorio'));
    }

    channel.update({ name: input.name?.trim(), description: input.description });

    await this.channels.update(channel, {
      userId: input.actorUserId,
      storeId: null,
      action: 'sales-channel.updated',
      entityType: 'sales_channel',
      entityId: channel.id,
      diff: { name: channel.name },
    });

    return ok(toSalesChannelOutput(channel));
  }
}

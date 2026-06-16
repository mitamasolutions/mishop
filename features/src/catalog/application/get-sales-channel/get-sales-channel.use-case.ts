import { err, ok, Result, UseCase } from '@mitama/core';
import { SalesChannelNotFoundError } from '../../domain/errors';
import type { SalesChannelRepository } from '../../domain/sales-channel.repository';
import { toSalesChannelOutput, type SalesChannelOutput } from '../sales-channel.dto';

export class GetSalesChannelUseCase
  implements UseCase<string, Result<SalesChannelOutput, SalesChannelNotFoundError>>
{
  constructor(private readonly channels: SalesChannelRepository) {}

  async execute(id: string): Promise<Result<SalesChannelOutput, SalesChannelNotFoundError>> {
    const channel = await this.channels.findById(id);
    if (!channel) {
      return err(new SalesChannelNotFoundError(id));
    }
    return ok(toSalesChannelOutput(channel));
  }
}

import { ok, Result, UseCase } from '@mitama/core';
import type { SalesChannelRepository } from '../../domain/sales-channel.repository';
import { toSalesChannelOutput, type SalesChannelOutput } from '../sales-channel.dto';

export class ListSalesChannelsUseCase implements UseCase<void, Result<SalesChannelOutput[], never>> {
  constructor(private readonly channels: SalesChannelRepository) {}

  async execute(): Promise<Result<SalesChannelOutput[], never>> {
    const channels = await this.channels.findAll();
    return ok(channels.map(toSalesChannelOutput));
  }
}

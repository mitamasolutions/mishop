import type { SalesChannel } from '../domain/sales-channel.entity';

export interface SalesChannelOutput {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toSalesChannelOutput(channel: SalesChannel): SalesChannelOutput {
  return {
    id: channel.id,
    name: channel.name,
    description: channel.description,
    isActive: channel.isActive,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
  };
}

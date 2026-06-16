import type { RecordActivityInput } from '../../activity-log';
import type { SalesChannel } from './sales-channel.entity';

export interface SalesChannelRepository {
  findById(id: string): Promise<SalesChannel | null>;
  findAll(): Promise<SalesChannel[]>;
  create(channel: SalesChannel, activity: RecordActivityInput): Promise<void>;
  update(channel: SalesChannel, activity: RecordActivityInput): Promise<void>;
}

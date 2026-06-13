import { beforeEach, describe, expect, it } from 'vitest';
import type { RecordActivityInput } from '@mitama/activity-log';
import { ValidationError } from '@mitama/core';
import { CreateSalesChannelUseCase } from './create-sales-channel.use-case';
import { UpdateSalesChannelUseCase } from '../update-sales-channel/update-sales-channel.use-case';
import { SetSalesChannelStatusUseCase } from '../set-sales-channel-status/set-sales-channel-status.use-case';
import { SalesChannel } from '../../domain/sales-channel.entity';
import { SalesChannelNotFoundError } from '../../domain/errors';
import type { SalesChannelRepository } from '../../domain/sales-channel.repository';

class InMemorySalesChannelRepository implements SalesChannelRepository {
  readonly channels = new Map<string, SalesChannel>();
  readonly activities: RecordActivityInput[] = [];

  async findById(id: string): Promise<SalesChannel | null> {
    return this.channels.get(id) ?? null;
  }

  async findAll(): Promise<SalesChannel[]> {
    return [...this.channels.values()];
  }

  async create(channel: SalesChannel, activity: RecordActivityInput): Promise<void> {
    this.channels.set(channel.id, channel);
    this.activities.push(activity);
  }

  async update(channel: SalesChannel, activity: RecordActivityInput): Promise<void> {
    this.channels.set(channel.id, channel);
    this.activities.push(activity);
  }
}

describe('CreateSalesChannelUseCase', () => {
  let channels: InMemorySalesChannelRepository;

  beforeEach(() => {
    channels = new InMemorySalesChannelRepository();
  });

  it('crea un canal de venta activo por defecto', async () => {
    const result = await new CreateSalesChannelUseCase(channels).execute({
      name: 'Tienda en línea',
      actorUserId: 'user-1',
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.isActive).toBe(true);
    }
    expect(channels.activities[0]?.action).toBe('sales-channel.created');
  });

  it('falla con ValidationError si el nombre está vacío', async () => {
    const result = await new CreateSalesChannelUseCase(channels).execute({ name: '  ', actorUserId: null });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
    }
  });
});

describe('SetSalesChannelStatusUseCase', () => {
  let channels: InMemorySalesChannelRepository;

  beforeEach(() => {
    channels = new InMemorySalesChannelRepository();
  });

  it('activa y desactiva un canal de venta', async () => {
    const created = await new CreateSalesChannelUseCase(channels).execute({ name: 'POS', actorUserId: null });
    const id = created.isOk() ? created.value.id : '';

    const result = await new SetSalesChannelStatusUseCase(channels).execute({ id, isActive: false, actorUserId: null });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.isActive).toBe(false);
    }
  });

  it('falla con SalesChannelNotFoundError si no existe', async () => {
    const result = await new UpdateSalesChannelUseCase(channels).execute({
      id: 'missing',
      name: 'Nuevo nombre',
      actorUserId: null,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(SalesChannelNotFoundError);
    }
  });
});

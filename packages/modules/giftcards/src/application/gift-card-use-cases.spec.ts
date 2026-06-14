import { describe, expect, it } from 'vitest';
import { InMemoryEventBus } from '@mitama/core';
import { InMemoryGiftCardRepository } from '../infra/in-memory-gift-card.repository';
import { OrderEventsHandler } from '../infra/order-events.handler';
import { DisableGiftCardUseCase, IssueGiftCardUseCase, RedeemGiftCardUseCase, ReleaseGiftCardForOrderUseCase } from './gift-card-use-cases';

describe('gift card use cases', () => {
  it('redime parcialmente y repite idempotente sin doble efecto', async () => {
    const repo = new InMemoryGiftCardRepository();
    const issued = await new IssueGiftCardUseCase(repo).execute({ storeId: 'store-1', code: ' gift ', initialBalance: 100, currencyCode: 'USD' });
    expect(issued.isOk()).toBe(true);
    const redeem = new RedeemGiftCardUseCase(repo);

    const first = await redeem.execute({ storeId: 'store-1', code: 'GIFT', orderId: 'order-1', orderTotal: 30, currencyCode: 'USD', idempotencyKey: 'idem-1' });
    const replay = await redeem.execute({ storeId: 'store-1', code: 'gift', orderId: 'order-1', orderTotal: 30, currencyCode: 'USD', idempotencyKey: 'idem-1' });

    expect(first.isOk()).toBe(true);
    expect(replay.isOk()).toBe(true);
    if (first.isOk() && replay.isOk()) {
      expect(first.value.remainingBalance).toBe(70);
      expect(replay.value).toEqual(first.value);
    }
  });

  it('rechaza moneda distinta y gift card deshabilitada', async () => {
    const repo = new InMemoryGiftCardRepository();
    const issued = await new IssueGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'GIFT', initialBalance: 100, currencyCode: 'USD' });
    expect(issued.isOk()).toBe(true);
    if (!issued.isOk()) return;
    const currencyMismatch = await new RedeemGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'GIFT', orderId: 'order-1', orderTotal: 10, currencyCode: 'MXN', idempotencyKey: 'idem-1' });
    await new DisableGiftCardUseCase(repo).execute({ storeId: 'store-1', id: issued.value.id });
    const disabled = await new RedeemGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'GIFT', orderId: 'order-2', orderTotal: 10, currencyCode: 'USD', idempotencyKey: 'idem-2' });

    expect(currencyMismatch.isErr()).toBe(true);
    expect(disabled.isErr()).toBe(true);
  });

  it('rechaza orderTotal <= 0 sin afectar saldo', async () => {
    const repo = new InMemoryGiftCardRepository();
    const issued = await new IssueGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'GIFT', initialBalance: 50, currencyCode: 'USD' });
    expect(issued.isOk()).toBe(true);

    const zero = await new RedeemGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'GIFT', orderId: 'order-1', orderTotal: 0, currencyCode: 'USD', idempotencyKey: 'idem-zero' });
    const negative = await new RedeemGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'GIFT', orderId: 'order-2', orderTotal: -10, currencyCode: 'USD', idempotencyKey: 'idem-neg' });

    expect(zero.isErr()).toBe(true);
    expect(negative.isErr()).toBe(true);
    const card = await repo.findByCode('store-1', 'GIFT');
    expect(card?.balance).toBe(50);
  });

  it('gift card vencida no es redimible y el estado en disco no se pisa por el camino de error', async () => {
    const repo = new InMemoryGiftCardRepository();
    const expiresAt = new Date(Date.now() - 60_000);
    const issued = await new IssueGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'OLD', initialBalance: 100, currencyCode: 'USD', expiresAt });
    expect(issued.isOk()).toBe(true);

    const result = await new RedeemGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'OLD', orderId: 'order-1', orderTotal: 20, currencyCode: 'USD', idempotencyKey: 'idem-expired' });

    expect(result.isErr()).toBe(true);
    const card = await repo.findByCode('store-1', 'OLD');
    // Mantenemos `active` en disco: no escribimos en la rama de error para
    // no chocar con el version-guard del commitRedemption (#1). El estado
    // efectivo "no redimible" lo decide el caso de uso al validar.
    expect(card?.status).toBe('active');
  });

  it('disabled no se convierte en expired si después vence', async () => {
    const repo = new InMemoryGiftCardRepository();
    const issued = await new IssueGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'DIS', initialBalance: 100, currencyCode: 'USD', expiresAt: new Date(Date.now() - 60_000) });
    expect(issued.isOk()).toBe(true);
    if (!issued.isOk()) return;
    await new DisableGiftCardUseCase(repo).execute({ storeId: 'store-1', id: issued.value.id });

    const result = await new RedeemGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'DIS', orderId: 'order-1', orderTotal: 10, currencyCode: 'USD', idempotencyKey: 'idem-dis' });

    expect(result.isErr()).toBe(true);
    const card = await repo.findByCode('store-1', 'DIS');
    expect(card?.status).toBe('disabled');
  });

  it('carrera de claves distintas: nunca redime más que el saldo y exactamente una gana', async () => {
    const repo = new InMemoryGiftCardRepository();
    const issued = await new IssueGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'RACE', initialBalance: 100, currencyCode: 'USD' });
    expect(issued.isOk()).toBe(true);
    const redeem = new RedeemGiftCardUseCase(repo);

    const [first, second] = await Promise.all([
      redeem.execute({ storeId: 'store-1', code: 'RACE', orderId: 'order-a', orderTotal: 100, currencyCode: 'USD', idempotencyKey: 'race-a' }),
      redeem.execute({ storeId: 'store-1', code: 'RACE', orderId: 'order-b', orderTotal: 100, currencyCode: 'USD', idempotencyKey: 'race-b' }),
    ]);

    const successes = [first, second].filter((result) => result.isOk());
    expect(successes).toHaveLength(1);
    const winner = first.isOk() ? first.value : second.isOk() ? second.value : null;
    expect(winner?.redeemedAmount).toBe(100);
    const card = await repo.findByCode('store-1', 'RACE');
    expect(card?.balance).toBe(0);
    expect(card?.balance).toBeGreaterThanOrEqual(0);
    expect(card?.status).toBe('depleted');
  });

  it('misma clave concurrente devuelve el mismo resultado y una sola redención', async () => {
    const repo = new InMemoryGiftCardRepository();
    const issued = await new IssueGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'SAMEKEY', initialBalance: 80, currencyCode: 'USD' });
    expect(issued.isOk()).toBe(true);
    const redeem = new RedeemGiftCardUseCase(repo);

    const [first, second] = await Promise.all([
      redeem.execute({ storeId: 'store-1', code: 'SAMEKEY', orderId: 'order-1', orderTotal: 30, currencyCode: 'USD', idempotencyKey: 'same' }),
      redeem.execute({ storeId: 'store-1', code: 'SAMEKEY', orderId: 'order-1', orderTotal: 30, currencyCode: 'USD', idempotencyKey: 'same' }),
    ]);

    expect(first.isOk() && second.isOk()).toBe(true);
    if (first.isOk() && second.isOk()) {
      expect(first.value).toEqual(second.value);
      expect(first.value.redeemedAmount).toBe(30);
    }
    const card = await repo.findByCode('store-1', 'SAMEKEY');
    expect(card?.balance).toBe(50);
  });

  describe('release por cancelación / reembolso (#7)', () => {
    it('restituye saldo exacto y reactiva depleted→active', async () => {
      const repo = new InMemoryGiftCardRepository();
      const issued = await new IssueGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'REL', initialBalance: 50, currencyCode: 'USD' });
      expect(issued.isOk()).toBe(true);
      const redeem = await new RedeemGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'REL', orderId: 'order-9', orderTotal: 50, currencyCode: 'USD', idempotencyKey: 'r-1' });
      expect(redeem.isOk()).toBe(true);
      const depleted = await repo.findByCode('store-1', 'REL');
      expect(depleted?.status).toBe('depleted');
      expect(depleted?.balance).toBe(0);

      const release = await new ReleaseGiftCardForOrderUseCase(repo).execute({ storeId: 'store-1', orderId: 'order-9' });

      expect(release.isOk()).toBe(true);
      if (release.isOk()) {
        expect(release.value).toEqual({ released: 1, restoredAmount: 50 });
      }
      const restored = await repo.findByCode('store-1', 'REL');
      expect(restored?.balance).toBe(50);
      expect(restored?.status).toBe('active');
    });

    it('emitir el evento dos veces no duplica la restitución (idempotencia vía reversedAt)', async () => {
      const repo = new InMemoryGiftCardRepository();
      await new IssueGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'IDEM', initialBalance: 30, currencyCode: 'USD' });
      await new RedeemGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'IDEM', orderId: 'order-10', orderTotal: 20, currencyCode: 'USD', idempotencyKey: 'r-idem' });
      const release = new ReleaseGiftCardForOrderUseCase(repo);

      const first = await release.execute({ storeId: 'store-1', orderId: 'order-10' });
      const second = await release.execute({ storeId: 'store-1', orderId: 'order-10' });

      expect(first.isOk() && second.isOk()).toBe(true);
      if (first.isOk() && second.isOk()) {
        expect(first.value.released).toBe(1);
        expect(second.value.released).toBe(0);
      }
      const card = await repo.findByCode('store-1', 'IDEM');
      expect(card?.balance).toBe(30);
    });

    it('release concurrente con otra redención: el version-guard impide perder saldo', async () => {
      const repo = new InMemoryGiftCardRepository();
      await new IssueGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'CONC', initialBalance: 100, currencyCode: 'USD' });
      const redeem = new RedeemGiftCardUseCase(repo);
      const r1 = await redeem.execute({ storeId: 'store-1', code: 'CONC', orderId: 'order-A', orderTotal: 40, currencyCode: 'USD', idempotencyKey: 'c-1' });
      expect(r1.isOk()).toBe(true);
      const release = new ReleaseGiftCardForOrderUseCase(repo);

      const [released, redeemed] = await Promise.all([
        release.execute({ storeId: 'store-1', orderId: 'order-A' }),
        redeem.execute({ storeId: 'store-1', code: 'CONC', orderId: 'order-B', orderTotal: 30, currencyCode: 'USD', idempotencyKey: 'c-2' }),
      ]);

      expect(released.isOk() && redeemed.isOk()).toBe(true);
      // Saldo final: empezamos en 60 (100-40). Reembolso suma 40, segunda redención resta 30.
      // El orden de resolución microtarea es determinístico pero el guard de versión asegura
      // que ninguna mutación se pierda: el total final siempre es 100 - 30 + 40 - 40 = 70.
      const card = await repo.findByCode('store-1', 'CONC');
      expect(card?.balance).toBe(70);
    });

    it('handler de eventos: order.refunded dispara el release y order desconocida no falla', async () => {
      const repo = new InMemoryGiftCardRepository();
      const bus = new InMemoryEventBus();
      const release = new ReleaseGiftCardForOrderUseCase(repo);
      const handler = new OrderEventsHandler(bus, release);
      handler.onModuleInit();
      await new IssueGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'HND', initialBalance: 40, currencyCode: 'USD' });
      await new RedeemGiftCardUseCase(repo).execute({ storeId: 'store-1', code: 'HND', orderId: 'order-h', orderTotal: 15, currencyCode: 'USD', idempotencyKey: 'h-1' });

      await bus.publish({ name: 'order.refunded', occurredAt: new Date(), payload: { orderId: 'order-h', orderNumber: 'WEB-h', storeId: 'store-1', customerId: 'c', productIds: [] } });
      await bus.publish({ name: 'order.cancelled', occurredAt: new Date(), payload: { orderId: 'order-unknown', orderNumber: 'WEB-x', storeId: 'store-1', customerId: 'c', productIds: [] } });

      const card = await repo.findByCode('store-1', 'HND');
      expect(card?.balance).toBe(40);
      expect(card?.status).toBe('active');
    });
  });
});

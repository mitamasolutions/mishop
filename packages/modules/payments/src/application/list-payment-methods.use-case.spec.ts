import { describe, expect, it } from 'vitest';
import { ListPaymentMethodsUseCase } from './list-payment-methods.use-case';
import { makeContext } from './payments.test-context';

function build() {
  const ctx = makeContext();
  const list = new ListPaymentMethodsUseCase(ctx.methods, ctx.registry);
  return { ...ctx, list };
}

describe('ListPaymentMethodsUseCase', () => {
  it('incluye solo los métodos bien configurados', async () => {
    const ctx = build();

    const result = await ctx.list.execute('default');

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.map((method) => method.providerCode)).toContain('test');
  });

  it('excluye un método mal configurado (sin credenciales/secret)', async () => {
    const ctx = build();
    void ctx.methods.save({
      id: 'default-test', storeId: 'default', providerCode: 'test', displayName: 'Test', enabled: true,
      credentials: {}, webhookSecret: null, captureMode: 'automatic',
    });

    const result = await ctx.list.execute('default');

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.map((method) => method.providerCode)).not.toContain('test');
  });
});

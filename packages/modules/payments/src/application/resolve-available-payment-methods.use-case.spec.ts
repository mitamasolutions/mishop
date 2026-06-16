import { describe, expect, it } from 'vitest';
import { ResolveAvailablePaymentMethodsUseCase } from './resolve-available-payment-methods.use-case';
import { makeContext } from './payments.test-context';

function build() {
  const ctx = makeContext();
  const resolveAvailable = new ResolveAvailablePaymentMethodsUseCase(ctx.methods, ctx.registry);
  return { ...ctx, resolveAvailable };
}

describe('ResolveAvailablePaymentMethodsUseCase', () => {
  it('marca un método configurado correctamente como disponible', async () => {
    const ctx = build();

    const available = await ctx.resolveAvailable.execute('default');

    expect(available.isOk()).toBe(true);
    if (!available.isOk()) return;
    const testMethod = available.value.find((entry) => entry.method.providerCode === 'test');
    expect(testMethod?.status).toBe('configured');
  });

  it('marca como misconfigured un método sin webhookSecret/credenciales y expone la razón', async () => {
    const ctx = build();
    void ctx.methods.save({
      id: 'default-test', storeId: 'default', providerCode: 'test', displayName: 'Test', enabled: true,
      credentials: {}, webhookSecret: null, captureMode: 'automatic',
    });

    const available = await ctx.resolveAvailable.execute('default');

    expect(available.isOk()).toBe(true);
    if (!available.isOk()) return;
    const testMethod = available.value.find((entry) => entry.method.providerCode === 'test');
    expect(testMethod?.status).toBe('misconfigured');
    expect(testMethod?.misconfigurationReason).toContain('Faltan');
  });
});

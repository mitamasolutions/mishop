import { describe, expect, it } from 'vitest';
import { ConfigureStorePaymentMethodUseCase } from './configure-store-payment-method.use-case';
import { makeContext } from './payments.test-context';

function build() {
  const ctx = makeContext();
  const configure = new ConfigureStorePaymentMethodUseCase(ctx.methods, ctx.registry);
  return { ...ctx, configure };
}

describe('ConfigureStorePaymentMethodUseCase', () => {
  it('crea la configuración de un método para una tienda nueva', async () => {
    const ctx = build();

    const result = await ctx.configure.execute({
      storeId: 'store-x',
      providerCode: 'test',
      displayName: 'Pasarela test',
      enabled: true,
      webhookSecret: 'wh-secret',
      captureMode: 'automatic',
      credentials: { apiKey: 'sk_x' },
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.providerCode).toBe('test');
    expect(result.value.enabled).toBe(true);
    expect(result.value.displayName).toBe('Pasarela test');
  });

  it('actualiza la configuración existente conservando el id', async () => {
    const ctx = build();
    const before = await ctx.methods.findByProvider('default', 'test');

    const result = await ctx.configure.execute({ storeId: 'default', providerCode: 'test', enabled: false });

    expect(result.isOk()).toBe(true);
    const after = await ctx.methods.findByProvider('default', 'test');
    expect(after?.id).toBe(before?.id);
    expect(after?.enabled).toBe(false);
  });

  it('lanza si el provider no está registrado', async () => {
    const ctx = build();

    await expect(ctx.configure.execute({ storeId: 'default', providerCode: 'inexistente' })).rejects.toThrow();
  });
});

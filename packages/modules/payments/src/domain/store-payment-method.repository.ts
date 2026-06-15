import type { DecryptedPaymentMethodConfig } from './payment-provider';

/**
 * Método de pago configurado por tienda. La representación de dominio
 * carga ya descifrado el `credentials` (r14 · sprint1_cierre); el
 * `webhookSecret` también queda en claro en memoria para que el use case
 * de webhooks lo use sin volver a tocar el cipher. Solo el adapter Prisma
 * conoce el formato cifrado en disco.
 */
export interface StorePaymentMethod {
  id: string;
  storeId: string;
  providerCode: string;
  displayName: string;
  enabled: boolean;
  /** Secretos descifrados (accessToken, publicKey, etc. del plugin). */
  credentials: Record<string, unknown>;
  webhookSecret: string | null;
  captureMode: 'manual' | 'automatic';
}

/** Representación pública (sin secretos) para selectores y listados. */
export interface PublicStorePaymentMethod {
  id: string;
  providerCode: string;
  displayName: string;
  enabled: boolean;
  captureMode: 'manual' | 'automatic';
}

export interface StorePaymentMethodRepository {
  /**
   * Devuelve todos los métodos habilitados de la tienda, con secretos
   * **descifrados**. El filtro `configured` lo aplica
   * `ResolveAvailablePaymentMethodsUseCase`.
   */
  findEnabled(storeId: string): Promise<StorePaymentMethod[]>;
  findEnabledByProvider(storeId: string, providerCode: string): Promise<StorePaymentMethod | null>;
  findEnabledByProviderAcrossStores(providerCode: string): Promise<StorePaymentMethod[]>;
  /** Devuelve el método sin filtro `enabled`, útil para admin/config. */
  findByProvider(storeId: string, providerCode: string): Promise<StorePaymentMethod | null>;
  save(method: StorePaymentMethod): Promise<void>;
}

export function toPublicPaymentMethod(method: StorePaymentMethod): PublicStorePaymentMethod {
  return {
    id: method.id,
    providerCode: method.providerCode,
    displayName: method.displayName,
    enabled: method.enabled,
    captureMode: method.captureMode,
  };
}

/** Adapter: extrae la config descifrada para pasar al plugin. */
export function toDecryptedConfig(method: StorePaymentMethod): DecryptedPaymentMethodConfig {
  return {
    credentials: method.credentials,
    webhookSecret: method.webhookSecret,
    captureMode: method.captureMode,
  };
}

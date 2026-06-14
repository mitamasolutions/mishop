export interface StorePaymentMethod {
  id: string;
  storeId: string;
  providerCode: string;
  displayName: string;
  enabled: boolean;
  encryptedCredentials: string | null;
  webhookSecret: string | null;
  captureMode: 'manual' | 'automatic';
}

export interface PublicStorePaymentMethod {
  id: string;
  providerCode: string;
  displayName: string;
  enabled: boolean;
  captureMode: 'manual' | 'automatic';
}

export interface StorePaymentMethodRepository {
  findEnabled(storeId: string): Promise<StorePaymentMethod[]>;
  findEnabledByProvider(storeId: string, providerCode: string): Promise<StorePaymentMethod | null>;
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

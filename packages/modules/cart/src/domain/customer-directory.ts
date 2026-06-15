export interface IdentifyCustomerInput {
  storeId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

/**
 * Puerto: directorio de clientes del comprador. El módulo cart lo usa para
 * resolver el `customerId` de un comprador (registrado o guest) durante el
 * checkout, sin importar el modelo interno del módulo `customers`.
 */
export interface CustomerDirectory {
  findOrCreateGuest(input: IdentifyCustomerInput): Promise<{ id: string }>;
}

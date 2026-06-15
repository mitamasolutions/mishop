import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@mitama/db';
import { PAYMENTS_TOKENS } from '../payments.tokens';
import type { StorePaymentMethod, StorePaymentMethodRepository } from '../domain/store-payment-method.repository';
import type { CredentialCipher } from './credential-cipher';

interface PrismaMethodRow {
  id: string;
  storeId: string;
  providerCode: string;
  displayName: string;
  enabled: boolean;
  encryptedCredentials: string | null;
  webhookSecret: string | null;
  captureMode: string;
}

/**
 * Adapter Prisma del repositorio de métodos de pago por tienda
 * (r14 · sprint1_cierre). Cifra al guardar y descifra al leer con
 * `CredentialCipher` (AES-256-GCM). El `webhookSecret` se persiste en
 * claro porque ya es un secreto rotable per-método; las credenciales del
 * provider (accessToken, etc.) **sí** se cifran.
 */
@Injectable()
export class PrismaStorePaymentMethodRepository implements StorePaymentMethodRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENTS_TOKENS.credentialCipher) private readonly cipher: CredentialCipher,
  ) {}

  async findEnabled(storeId: string): Promise<StorePaymentMethod[]> {
    const rows = await this.prisma.storePaymentMethod.findMany({ where: { storeId, enabled: true }, orderBy: { displayName: 'asc' } });
    return rows.map((row) => this.toDomain(row));
  }

  async findEnabledByProvider(storeId: string, providerCode: string): Promise<StorePaymentMethod | null> {
    const row = await this.prisma.storePaymentMethod.findUnique({ where: { storeId_providerCode: { storeId, providerCode } } });
    return row?.enabled ? this.toDomain(row) : null;
  }

  async findByProvider(storeId: string, providerCode: string): Promise<StorePaymentMethod | null> {
    const row = await this.prisma.storePaymentMethod.findUnique({ where: { storeId_providerCode: { storeId, providerCode } } });
    return row ? this.toDomain(row) : null;
  }

  async save(method: StorePaymentMethod): Promise<void> {
    const encryptedCredentials =
      method.credentials && Object.keys(method.credentials).length > 0 ? this.cipher.encryptJson(method.credentials) : null;
    const row = {
      id: method.id,
      storeId: method.storeId,
      providerCode: method.providerCode,
      displayName: method.displayName,
      enabled: method.enabled,
      encryptedCredentials,
      webhookSecret: method.webhookSecret,
      captureMode: method.captureMode,
    };
    await this.prisma.storePaymentMethod.upsert({
      where: { storeId_providerCode: { storeId: method.storeId, providerCode: method.providerCode } },
      create: row,
      update: row,
    });
  }

  private toDomain(row: PrismaMethodRow): StorePaymentMethod {
    return {
      id: row.id,
      storeId: row.storeId,
      providerCode: row.providerCode,
      displayName: row.displayName,
      enabled: row.enabled,
      credentials: row.encryptedCredentials ? this.cipher.decryptJson<Record<string, unknown>>(row.encryptedCredentials) : {},
      webhookSecret: row.webhookSecret,
      captureMode: row.captureMode === 'manual' ? 'manual' : 'automatic',
    };
  }
}

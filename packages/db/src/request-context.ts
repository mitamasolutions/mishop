import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

/** Contexto de la petición: usuario autenticado y tienda activa (header X-Store-Id). */
export interface RequestContext {
  userId: string | null;
  storeId: string | null;
  isSuperAdmin: boolean;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Propaga el contexto de la petición vía AsyncLocalStorage. Lo establece
 * el guard de tienda activa (@mitama/stores) al inicio del request; lo lee
 * la extensión de scoping de Prisma (./scoping.extension.ts).
 */
@Injectable()
export class RequestContextService {
  run<T>(context: RequestContext, fn: () => T): T {
    return storage.run(context, fn);
  }

  get(): RequestContext | undefined {
    return storage.getStore();
  }

  getUserId(): string | null {
    return this.get()?.userId ?? null;
  }

  getStoreId(): string | null {
    return this.get()?.storeId ?? null;
  }

  isSuperAdmin(): boolean {
    return this.get()?.isSuperAdmin ?? false;
  }
}

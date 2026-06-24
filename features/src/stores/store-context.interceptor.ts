import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { RequestContextService } from '@mitama/data';
import type { ActiveStore, AuthenticatedUser } from '@mitama/contracts';

interface StoreContextRequest {
  user?: AuthenticatedUser;
  store?: ActiveStore;
  headers?: Record<string, string | string[] | undefined>;
}

interface ResponseWithSetHeader {
  setHeader?: (name: string, value: string) => unknown;
}

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Propaga `{ userId, storeId, isSuperAdmin, requestId }` vía
 * `RequestContextService` (AsyncLocalStorage) para el resto del request.
 * El `requestId` se toma del header `X-Request-Id` (si el cliente lo envía,
 * útil para correlación distribuida) o se genera uno nuevo, y se echo en
 * la respuesta para que el cliente lo vea (r24 · sprint1_cierre).
 */
@Injectable()
export class StoreContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<StoreContextRequest>();
    const response = httpCtx.getResponse<ResponseWithSetHeader>();
    const incomingId = request.headers?.[REQUEST_ID_HEADER];
    const requestId = (Array.isArray(incomingId) ? incomingId[0] : incomingId) ?? randomUUID();
    response.setHeader?.(REQUEST_ID_HEADER, requestId);

    const ctx = {
      userId: request.user?.id ?? null,
      storeId: request.store?.id ?? null,
      isSuperAdmin: request.user?.isSuperAdmin ?? false,
      requestId,
    };

    return new Observable((subscriber) => {
      this.requestContext.run(ctx, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}

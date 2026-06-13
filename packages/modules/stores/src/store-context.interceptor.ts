import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from '@mitama/db';
import type { ActiveStore, AuthenticatedUser } from '@mitama/contracts';

interface StoreContextRequest {
  user?: AuthenticatedUser;
  store?: ActiveStore;
}

/**
 * Propaga `{ userId, storeId, isSuperAdmin }` vía `RequestContextService`
 * (AsyncLocalStorage) para el resto del request, leyendo lo poblado por
 * `JwtAuthGuard` (`request.user`) y `StoreContextGuard` (`request.store`).
 */
@Injectable()
export class StoreContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<StoreContextRequest>();
    const ctx = {
      userId: request.user?.id ?? null,
      storeId: request.store?.id ?? null,
      isSuperAdmin: request.user?.isSuperAdmin ?? false,
    };

    return new Observable((subscriber) => {
      this.requestContext.run(ctx, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}

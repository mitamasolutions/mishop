/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { CART_TOKENS } from './cart.tokens';
import type { CartRepository } from './domain/cart.repository';
import type { CatalogSnapshotService } from './domain/catalog-snapshot';
import {
  AddCartLineUseCase,
  AdvanceCheckoutUseCase,
  ConfirmCartPriceChangesUseCase,
  GetOrCreateCartUseCase,
  MergeGuestCartUseCase,
  PurgeExpiredCartsUseCase,
  RefreshCartUseCase,
} from './application/cart-use-cases';
import { PrismaCartRepository } from './infra/prisma-cart.repository';
import { PrismaCatalogSnapshotService } from './infra/prisma-catalog-snapshot.service';
import { CartController } from './http/cart.controller';

@Module({
  controllers: [CartController],
  providers: [
    { provide: CART_TOKENS.cartRepository, useClass: PrismaCartRepository },
    { provide: CART_TOKENS.catalogSnapshot, useClass: PrismaCatalogSnapshotService },
    {
      provide: GetOrCreateCartUseCase,
      useFactory: (carts: CartRepository) => new GetOrCreateCartUseCase(carts),
      inject: [CART_TOKENS.cartRepository],
    },
    {
      provide: AddCartLineUseCase,
      useFactory: (carts: CartRepository, catalog: CatalogSnapshotService) => new AddCartLineUseCase(carts, catalog),
      inject: [CART_TOKENS.cartRepository, CART_TOKENS.catalogSnapshot],
    },
    {
      provide: RefreshCartUseCase,
      useFactory: (carts: CartRepository, catalog: CatalogSnapshotService) => new RefreshCartUseCase(carts, catalog),
      inject: [CART_TOKENS.cartRepository, CART_TOKENS.catalogSnapshot],
    },
    {
      provide: ConfirmCartPriceChangesUseCase,
      useFactory: (carts: CartRepository) => new ConfirmCartPriceChangesUseCase(carts),
      inject: [CART_TOKENS.cartRepository],
    },
    {
      provide: AdvanceCheckoutUseCase,
      useFactory: (carts: CartRepository) => new AdvanceCheckoutUseCase(carts),
      inject: [CART_TOKENS.cartRepository],
    },
    {
      provide: MergeGuestCartUseCase,
      useFactory: (carts: CartRepository, catalog: CatalogSnapshotService) => new MergeGuestCartUseCase(carts, catalog),
      inject: [CART_TOKENS.cartRepository, CART_TOKENS.catalogSnapshot],
    },
    {
      provide: PurgeExpiredCartsUseCase,
      useFactory: (carts: CartRepository) => new PurgeExpiredCartsUseCase(carts),
      inject: [CART_TOKENS.cartRepository],
    },
  ],
  exports: [CART_TOKENS.cartRepository],
})
export class CartModule {}

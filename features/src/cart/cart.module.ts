/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { createModuleProviders } from '@mitama/contracts';
import { CART_TOKENS } from './cart.tokens';
import {
  AddCartLineUseCase,
  AdvanceCheckoutUseCase,
  ConfirmCartPriceChangesUseCase,
  GetOrCreateCartUseCase,
  IdentifyCheckoutCustomerUseCase,
  MergeGuestCartUseCase,
  PurgeExpiredCartsUseCase,
  RefreshCartUseCase,
} from './application/cart-use-cases';
import { PrismaCartRepository } from './infra/prisma-cart.repository';
import { PrismaCatalogSnapshotService } from './infra/prisma-catalog-snapshot.service';
import { PrismaCustomerDirectory } from './infra/prisma-customer-directory';
import { CartController } from './http/cart.controller';

@Module({
  controllers: [CartController],
  providers: createModuleProviders([
    { provide: CART_TOKENS.cartRepository, useClass: PrismaCartRepository },
    { provide: CART_TOKENS.catalogSnapshot, useClass: PrismaCatalogSnapshotService },
    { provide: CART_TOKENS.customerDirectory, useClass: PrismaCustomerDirectory },
    { useCase: GetOrCreateCartUseCase, inject: [CART_TOKENS.cartRepository] },
    { useCase: AddCartLineUseCase, inject: [CART_TOKENS.cartRepository, CART_TOKENS.catalogSnapshot] },
    { useCase: RefreshCartUseCase, inject: [CART_TOKENS.cartRepository, CART_TOKENS.catalogSnapshot] },
    { useCase: ConfirmCartPriceChangesUseCase, inject: [CART_TOKENS.cartRepository] },
    { useCase: AdvanceCheckoutUseCase, inject: [CART_TOKENS.cartRepository] },
    { useCase: IdentifyCheckoutCustomerUseCase, inject: [CART_TOKENS.cartRepository, CART_TOKENS.customerDirectory] },
    { useCase: MergeGuestCartUseCase, inject: [CART_TOKENS.cartRepository, CART_TOKENS.catalogSnapshot] },
    { useCase: PurgeExpiredCartsUseCase, inject: [CART_TOKENS.cartRepository] },
  ]),
  exports: [CART_TOKENS.cartRepository],
})
export class CartModule {}

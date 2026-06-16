/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Global, Module } from '@nestjs/common';
import { CHECKOUT_SHIPPING_RESOLVER_PORT, createModuleProviders, EVENT_BUS } from '@mitama/contracts';
import { SHIPPING_TOKENS } from './shipping.tokens';
import { CalculateShippingRatesUseCase, CreateShipmentUseCase, ListShipmentsByOrderUseCase, UpdateShipmentStatusUseCase } from './application/shipping-use-cases';
import { ShippingProviderRegistry, type ShippingProvider } from './domain/shipping-provider';
import { DefaultShippingProvider } from './infra/default-shipping-provider';
import { CheckoutShippingResolverAdapter } from './infra/checkout-shipping-resolver.adapter';
import { PrismaShippingMethodRepository } from './infra/prisma-shipping-method.repository';
import { PrismaShipmentRepository } from './infra/prisma-shipment.repository';
import { ShippingController } from './http/shipping.controller';

@Global()
@Module({
  controllers: [ShippingController],
  providers: createModuleProviders([
    { provide: SHIPPING_TOKENS.methodRepository, useClass: PrismaShippingMethodRepository },
    { provide: SHIPPING_TOKENS.shipmentRepository, useClass: PrismaShipmentRepository },
    { provide: SHIPPING_TOKENS.providers, factory: (): ShippingProvider[] => [new DefaultShippingProvider()] },
    { provide: SHIPPING_TOKENS.providerRegistry, factory: (providers: ShippingProvider[]) => new ShippingProviderRegistry(providers), inject: [SHIPPING_TOKENS.providers] },
    {
      provide: CHECKOUT_SHIPPING_RESOLVER_PORT,
      factory: (methods, registry: ShippingProviderRegistry) => new CheckoutShippingResolverAdapter(methods, registry),
      inject: [SHIPPING_TOKENS.methodRepository, SHIPPING_TOKENS.providerRegistry],
    },
    { useCase: CalculateShippingRatesUseCase, inject: [SHIPPING_TOKENS.methodRepository, SHIPPING_TOKENS.providerRegistry] },
    { useCase: CreateShipmentUseCase, inject: [SHIPPING_TOKENS.shipmentRepository] },
    { useCase: ListShipmentsByOrderUseCase, inject: [SHIPPING_TOKENS.shipmentRepository] },
    { useCase: UpdateShipmentStatusUseCase, inject: [SHIPPING_TOKENS.shipmentRepository, EVENT_BUS] },
  ]),
  exports: [SHIPPING_TOKENS.providerRegistry, CHECKOUT_SHIPPING_RESOLVER_PORT],
})
export class ShippingModule {}

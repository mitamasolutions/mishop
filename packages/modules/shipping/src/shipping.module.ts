/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Global, Module } from '@nestjs/common';
import { CHECKOUT_SHIPPING_RESOLVER_PORT, EVENT_BUS } from '@mitama/contracts';
import type { EventBus } from '@mitama/core';
import { SHIPPING_TOKENS } from './shipping.tokens';
import { CalculateShippingRatesUseCase, CreateShipmentUseCase, UpdateShipmentStatusUseCase } from './application/shipping-use-cases';
import { ShippingProviderRegistry, type ShippingProvider } from './domain/shipping-provider';
import type { ShippingMethodRepository } from './domain/shipping-method.repository';
import type { ShipmentRepository } from './domain/shipment.repository';
import { DefaultShippingProvider } from './infra/default-shipping-provider';
import { CheckoutShippingResolverAdapter } from './infra/checkout-shipping-resolver.adapter';
import { PrismaShippingMethodRepository } from './infra/prisma-shipping-method.repository';
import { PrismaShipmentRepository } from './infra/prisma-shipment.repository';
import { ShippingController } from './http/shipping.controller';

@Global()
@Module({
  controllers: [ShippingController],
  providers: [
    { provide: SHIPPING_TOKENS.methodRepository, useClass: PrismaShippingMethodRepository },
    { provide: SHIPPING_TOKENS.shipmentRepository, useClass: PrismaShipmentRepository },
    { provide: SHIPPING_TOKENS.providers, useFactory: (): ShippingProvider[] => [new DefaultShippingProvider()] },
    { provide: SHIPPING_TOKENS.providerRegistry, useFactory: (providers: ShippingProvider[]) => new ShippingProviderRegistry(providers), inject: [SHIPPING_TOKENS.providers] },
    {
      provide: CHECKOUT_SHIPPING_RESOLVER_PORT,
      useFactory: (methods: ShippingMethodRepository, registry: ShippingProviderRegistry) => new CheckoutShippingResolverAdapter(methods, registry),
      inject: [SHIPPING_TOKENS.methodRepository, SHIPPING_TOKENS.providerRegistry],
    },
    {
      provide: CalculateShippingRatesUseCase,
      useFactory: (methods: ShippingMethodRepository, registry: ShippingProviderRegistry) => new CalculateShippingRatesUseCase(methods, registry),
      inject: [SHIPPING_TOKENS.methodRepository, SHIPPING_TOKENS.providerRegistry],
    },
    { provide: CreateShipmentUseCase, useFactory: (shipments: ShipmentRepository) => new CreateShipmentUseCase(shipments), inject: [SHIPPING_TOKENS.shipmentRepository] },
    {
      provide: UpdateShipmentStatusUseCase,
      useFactory: (shipments: ShipmentRepository, eventBus: EventBus) => new UpdateShipmentStatusUseCase(shipments, eventBus),
      inject: [SHIPPING_TOKENS.shipmentRepository, EVENT_BUS],
    },
  ],
  exports: [SHIPPING_TOKENS.providerRegistry, CHECKOUT_SHIPPING_RESOLVER_PORT],
})
export class ShippingModule {}

/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Global, Module } from '@nestjs/common';
import { CHECKOUT_TAX_RESOLVER_PORT, createModuleProviders } from '@mitama/contracts';
import { TAXES_TOKENS } from './taxes.tokens';
import { CalculateTaxesUseCase } from './application/tax-use-cases';
import { TaxProviderRegistry, type TaxProvider } from './domain/tax-provider';
import { PrismaStoreTaxSettingsRepository } from './infra/prisma-store-tax-settings.repository';
import { PrismaTaxRuleRepository } from './infra/prisma-tax-rule.repository';
import { MxIvaTaxProvider } from './infra/mx-iva-tax-provider';
import { CheckoutTaxResolverAdapter } from './infra/checkout-tax-resolver.adapter';
import { TaxesController } from './http/taxes.controller';

@Global()
@Module({
  controllers: [TaxesController],
  providers: createModuleProviders([
    { provide: TAXES_TOKENS.ruleRepository, useClass: PrismaTaxRuleRepository },
    { provide: TAXES_TOKENS.storeSettingsRepository, useClass: PrismaStoreTaxSettingsRepository },
    { provide: TAXES_TOKENS.providers, factory: (rules): TaxProvider[] => [new MxIvaTaxProvider(rules)], inject: [TAXES_TOKENS.ruleRepository] },
    { provide: TAXES_TOKENS.providerRegistry, factory: (providers: TaxProvider[]) => new TaxProviderRegistry(providers), inject: [TAXES_TOKENS.providers] },
    {
      provide: CHECKOUT_TAX_RESOLVER_PORT,
      factory: (settings, registry: TaxProviderRegistry) => new CheckoutTaxResolverAdapter(settings, registry),
      inject: [TAXES_TOKENS.storeSettingsRepository, TAXES_TOKENS.providerRegistry],
    },
    { useCase: CalculateTaxesUseCase, inject: [TAXES_TOKENS.storeSettingsRepository, TAXES_TOKENS.providerRegistry] },
  ]),
  exports: [TAXES_TOKENS.providerRegistry, CHECKOUT_TAX_RESOLVER_PORT],
})
export class TaxesModule {}

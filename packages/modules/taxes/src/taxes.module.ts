/**
 * Composición del módulo: el único lugar donde las capas se conectan.
 */
import { Module } from '@nestjs/common';
import { TAXES_TOKENS } from './taxes.tokens';
import { CalculateTaxesUseCase } from './application/tax-use-cases';
import { TaxProviderRegistry, type TaxProvider } from './domain/tax-provider';
import type { StoreTaxSettingsRepository } from './domain/store-tax-settings.repository';
import type { TaxRuleRepository } from './domain/tax-rule.repository';
import { PrismaStoreTaxSettingsRepository } from './infra/prisma-store-tax-settings.repository';
import { PrismaTaxRuleRepository } from './infra/prisma-tax-rule.repository';
import { MxIvaTaxProvider } from './infra/mx-iva-tax-provider';
import { TaxesController } from './http/taxes.controller';

@Module({
  controllers: [TaxesController],
  providers: [
    { provide: TAXES_TOKENS.ruleRepository, useClass: PrismaTaxRuleRepository },
    { provide: TAXES_TOKENS.storeSettingsRepository, useClass: PrismaStoreTaxSettingsRepository },
    { provide: TAXES_TOKENS.providers, useFactory: (rules: TaxRuleRepository): TaxProvider[] => [new MxIvaTaxProvider(rules)], inject: [TAXES_TOKENS.ruleRepository] },
    { provide: TAXES_TOKENS.providerRegistry, useFactory: (providers: TaxProvider[]) => new TaxProviderRegistry(providers), inject: [TAXES_TOKENS.providers] },
    {
      provide: CalculateTaxesUseCase,
      useFactory: (settings: StoreTaxSettingsRepository, registry: TaxProviderRegistry) => new CalculateTaxesUseCase(settings, registry),
      inject: [TAXES_TOKENS.storeSettingsRepository, TAXES_TOKENS.providerRegistry],
    },
  ],
  exports: [TAXES_TOKENS.providerRegistry],
})
export class TaxesModule {}

import type { InjectionToken, Provider, Type } from '@nestjs/common';

type ClassConstructor<T = unknown> = new (...args: never[]) => T;

type ClassProviderDefinition = {
  provide: InjectionToken;
  useClass: Type<unknown>;
};

type ValueProviderDefinition = {
  provide: InjectionToken;
  useValue: unknown;
};

type FactoryProviderDefinition = {
  provide: InjectionToken;
  factory: (...deps: never[]) => unknown;
  inject?: InjectionToken[];
};

type UseCaseProviderDefinition = {
  useCase: ClassConstructor;
  inject?: InjectionToken[];
};

type InjectableProviderDefinition = {
  provider: ClassConstructor;
  inject?: InjectionToken[];
};

export type ModuleProviderDefinition =
  | ClassProviderDefinition
  | ValueProviderDefinition
  | FactoryProviderDefinition
  | UseCaseProviderDefinition
  | InjectableProviderDefinition;

export function createModuleProviders(definitions: ModuleProviderDefinition[]): Provider[] {
  return definitions.map((definition) => {
    if ('useCase' in definition || 'provider' in definition) {
      const target = 'useCase' in definition ? definition.useCase : definition.provider;
      const Target = target as new (...deps: unknown[]) => unknown;
      return {
        provide: target,
        useFactory: (...deps: unknown[]) => new Target(...deps),
        inject: definition.inject ?? [],
      } satisfies Provider;
    }

    if ('useClass' in definition) {
      return {
        provide: definition.provide,
        useClass: definition.useClass,
      } satisfies Provider;
    }

    if ('useValue' in definition) {
      return {
        provide: definition.provide,
        useValue: definition.useValue,
      } satisfies Provider;
    }

    return {
      provide: definition.provide,
      useFactory: definition.factory,
      inject: definition.inject ?? [],
    } satisfies Provider;
  });
}

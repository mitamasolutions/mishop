import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Regla 3 de arquitectura: un módulo NUNCA importa internals de otro.
 * Solo se permite la API pública (`@mitama/<modulo>`) o `@mitama/contracts`.
 */
const crossModuleInternals = [
  {
    group: ['@mitama/*/src/**', '@mitama/*/dist/**'],
    message:
      'No importes internals de otro paquete: usa su API pública (@mitama/<paquete>) o @mitama/contracts.',
  },
  {
    group: ['../**/src/**'],
    message:
      'No cruces a otro paquete por ruta relativa: usa su API pública (@mitama/<paquete>) o @mitama/contracts.',
  },
];

/** Regla 2: Prisma solo vive en infra/. */
const prismaOnlyInInfra = [
  {
    group: ['@mitama/db', '@mitama/db/**', '@prisma/client', '@prisma/client/**'],
    message: 'Prisma solo se usa en la capa infra/ del módulo (regla 2 de arquitectura).',
  },
];

/** Regla 1: domain y application no dependen de frameworks. */
const noFrameworks = [
  {
    group: ['@nestjs/*', '@nestjs/**'],
    message: 'Esta capa no puede depender de NestJS (regla 1: dependencias hacia adentro).',
  },
];

const baseRestricted = ['error', { patterns: crossModuleInternals }];

/**
 * Config base para cualquier paquete del monorepo (apps, core, db, contracts).
 */
export const baseConfig = tseslint.config(
  {
    ignores: ['dist/**', '.next/**', 'node_modules/**', 'coverage/**', '*.config.*'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-restricted-imports': baseRestricted,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);

/**
 * Config para módulos de dominio (packages/modules/*): añade las reglas
 * de capas hexagonales sobre la base.
 */
export const moduleConfig = tseslint.config(
  ...baseConfig,
  {
    files: ['**/src/domain/**/*.ts'],
    ignores: ['**/*.spec.ts', '**/*.test-context.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...crossModuleInternals,
            ...prismaOnlyInInfra,
            ...noFrameworks,
            {
              group: ['**/application/**', '**/infra/**', '**/http/**'],
              message: 'domain no importa de capas externas (regla 1: http → application → domain).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/src/application/**/*.ts'],
    ignores: ['**/*.spec.ts', '**/*.test-context.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...crossModuleInternals,
            ...prismaOnlyInInfra,
            ...noFrameworks,
            {
              group: ['**/infra/**', '**/http/**'],
              message: 'application solo depende de domain (regla 1: http → application → domain).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/src/http/**/*.ts'],
    ignores: ['**/*.spec.ts', '**/*.test-context.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...crossModuleInternals,
            ...prismaOnlyInInfra,
            {
              group: ['**/infra/**'],
              message:
                'http no importa infra directamente: el cableado vive en el módulo NestJS (composición).',
            },
          ],
        },
      ],
    },
  },
);

export default baseConfig;

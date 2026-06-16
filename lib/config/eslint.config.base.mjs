import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Regla 3 de arquitectura: una feature NUNCA importa internals de otra.
 * Solo se permite la API pública del paquete (`@mitama/<paquete>`),
 * `@mitama/contracts`, o el barrel `index.ts` de una feature hermana.
 *
 * Tras la reorganización a `features/`, las features hermanas conviven en
 * `features/src/<m>/...`. El regex bloquea saltar a las capas internas de
 * una feature hermana por ruta relativa (`../<sib>/domain/...`,
 * `../../<sib>/application/...`, etc.). La importación correcta es
 * `../<sib>` que resuelve al barrel.
 */
const SIBLING_FEATURES = [
  'activity-log', 'auth', 'cart', 'catalog', 'customers', 'giftcards',
  'inventory', 'orders', 'payments', 'promotions', 'reference-data',
  'reviews', 'scheduled-tasks', 'settings', 'shipping', 'stores', 'taxes',
];
const SIBLING_RE = `^(\\.\\./)+(${SIBLING_FEATURES.join('|')})/(domain|application|infra|http)(/|$)`;

const crossModuleInternals = [
  {
    group: ['@mitama/*/src/**', '@mitama/*/dist/**'],
    message:
      'No importes internals de otro paquete: usa su API pública (@mitama/<paquete>) o @mitama/contracts.',
  },
  {
    regex: SIBLING_RE,
    message:
      'No cruces a las capas internas de una feature hermana: importa su barrel (../<feature>) o @mitama/contracts.',
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
 * Config base para cualquier paquete del monorepo (apps, lib/*, plugins/*).
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
 * Config para el paquete `features/`: las capas hexagonales se aplican a
 * `**\/src/<feature>/{domain,application,http}/**` (un nivel extra respecto
 * al layout antiguo de módulo-por-paquete).
 */
export const moduleConfig = tseslint.config(
  ...baseConfig,
  {
    files: ['**/src/*/domain/**/*.ts'],
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
    files: ['**/src/*/application/**/*.ts'],
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
    files: ['**/src/*/http/**/*.ts'],
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

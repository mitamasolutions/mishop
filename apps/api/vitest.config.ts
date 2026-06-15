import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Carga el .env del root para dependencias env-aware en e2e.
loadEnv({ path: resolve(__dirname, '../../.env') });

export default defineConfig({
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});

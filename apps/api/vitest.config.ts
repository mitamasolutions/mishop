import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Carga el .env del root para que `requireCredentialCipher` y otras
// dependencias env-aware encuentren sus secretos en los e2e (r14 ·
// sprint1_cierre).
loadEnv({ path: resolve(__dirname, '../../.env') });

export default defineConfig({
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});


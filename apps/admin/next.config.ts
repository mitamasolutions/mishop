import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Necesario para que `next build` empaquete los workspaces locales en
  // `.next/standalone/node_modules` cuando se ejecuta dentro de un
  // monorepo Yarn con node-modules linker.
  outputFileTracingRoot: process.env.NEXT_OUTPUT_TRACING_ROOT,
};

export default nextConfig;

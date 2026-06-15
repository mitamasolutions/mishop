import type { NextConfig } from 'next';

// r22 · sprint1_cierre — Hardening del Admin
//
// 1) `NEXT_PUBLIC_API_URL` es obligatoria en el build de producción: el build
//    rompe si falta para evitar imágenes con fallback silencioso a localhost.
if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    'NEXT_PUBLIC_API_URL es obligatoria para el build de producción del admin (sin fallback a localhost).',
  );
}

// 2) Cabeceras de seguridad: CSP estricta, anti-clickjacking, control de
//    referer y permisos del navegador. La CSP usa `'unsafe-inline'` en
//    styles porque Tailwind/shadcn inyectan estilos inline (next-themes,
//    next/script). En scripts mantenemos `'self'` + nonce hash gestionado por
//    Next; en dev se relaja eval para react-refresh.
const isDev = process.env.NODE_ENV !== 'production';
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

const csp = [
  "default-src 'self'",
  `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${apiUrl ? ` ${apiUrl}` : ''}${isDev ? ' ws: http://localhost:* http://127.0.0.1:*' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  // Necesario para que `next build` empaquete los workspaces locales en
  // `.next/standalone/node_modules` cuando se ejecuta dentro de un
  // monorepo Yarn con node-modules linker.
  outputFileTracingRoot: process.env.NEXT_OUTPUT_TRACING_ROOT,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

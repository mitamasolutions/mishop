import type { CookieOptions, Response } from 'express';

/**
 * Configuración de la cookie del refresh token (r22 · sprint1_cierre).
 *
 * - `httpOnly`: inaccesible desde JavaScript del navegador.
 * - `secure`: solo HTTPS en producción; relajado en dev para localhost HTTP.
 * - `sameSite=lax`: API y Admin viven bajo el mismo dominio/site en el MVP.
 * - `path=/`: cookie disponible en todos los endpoints del mismo origen.
 *   El prefijo `/v1` se aplica solo en runtime de producción (main.ts) y
 *   no en e2e; scopearla a `/v1/auth` la haría inaccesible en tests.
 *   La protección real viene de HttpOnly + SameSite, no del path.
 * - `maxAge`: alineado con el TTL del refresh (7 días).
 */
export const REFRESH_COOKIE_NAME = 'mitama_refresh';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function refreshCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

export function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshCookieOptions(), maxAge: undefined });
}

/**
 * Extrae el refresh token. Fuente de verdad: cookie HttpOnly. Como puerta
 * de transición se acepta `bodyFallback` para no romper integraciones no-web
 * existentes (clientes server-to-server o tests). El admin no envía body.
 */
export function readRefreshToken(req: { cookies?: Record<string, string | undefined> }, bodyFallback: string | undefined): string | null {
  const fromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
  if (typeof fromCookie === 'string' && fromCookie.length > 0) {
    return fromCookie;
  }
  if (typeof bodyFallback === 'string' && bodyFallback.length > 0) {
    return bodyFallback;
  }
  return null;
}


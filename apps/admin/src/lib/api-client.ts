import { useAuthStore } from './auth-store';

/**
 * URL base de la API. **Obligatoria** en build y runtime (r22 · sprint1_cierre):
 * sin fallback a `localhost` para que el build de producción rompa si falta.
 */
function resolveApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw || raw.length === 0) {
    throw new Error(
      'NEXT_PUBLIC_API_URL no está definida. Configúrala en tu .env(.local) o variables de despliegue.',
    );
  }
  return `${raw}/v1`;
}

const API_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** No envía `Authorization` (login, refresh, reference-data públicos). */
  skipAuth?: boolean;
  /**
   * No envía `X-Store-Id` aunque haya una tienda activa seleccionada.
   * Reservado **exclusivamente** para endpoints globales: settings globales,
   * reference-data, activity-log global, auth y health (r22 · sprint1_cierre).
   */
  skipStoreScope?: boolean;
}

async function doFetch(path: string, options: ApiRequestOptions, accessToken: string | null, storeId: string | null): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken && !options.skipAuth) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (storeId && !options.skipStoreScope) {
    headers['X-Store-Id'] = storeId;
  }

  return fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    // La cookie HttpOnly del refresh viaja en cada request a /auth/*.
    credentials: 'include',
  });
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) {
      return data.message.join(', ');
    }
    if (typeof data.message === 'string') {
      return data.message;
    }
  } catch {
    // El cuerpo no es JSON; se usa el mensaje genérico.
  }
  return `Error ${res.status}`;
}

async function refreshSession(): Promise<string | null> {
  const { setTokens, logout } = useAuthStore.getState();

  // El refresh token viaja en la cookie HttpOnly; el body queda vacío.
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    logout();
    return null;
  }

  const data = (await res.json()) as { accessToken: string };
  setTokens(data.accessToken);
  return data.accessToken;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { accessToken, activeStoreId } = useAuthStore.getState();
  let res = await doFetch(path, options, accessToken, activeStoreId);

  if (res.status === 401 && !options.skipAuth) {
    const newAccessToken = await refreshSession();
    if (newAccessToken) {
      res = await doFetch(path, options, newAccessToken, activeStoreId);
    }
  }

  if (!res.ok) {
    throw new ApiError(await extractErrorMessage(res), res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

/** Llama a `/auth/refresh` para restaurar la sesión al recargar la página. */
export async function restoreSession(): Promise<boolean> {
  return (await refreshSession()) !== null;
}

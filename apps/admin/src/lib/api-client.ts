import { useAuthStore } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** No envía `Authorization` (login, refresh, reference-data públicos). */
  skipAuth?: boolean;
  /** No envía `X-Store-Id` aunque haya una tienda activa seleccionada. */
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
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) {
    return null;
  }

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    logout();
    return null;
  }

  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  setTokens(data.accessToken, data.refreshToken);
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

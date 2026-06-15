import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { decodeJwt } from './jwt';

export interface StoreRole {
  storeId: string;
  roleId: string;
  permissions: string[];
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  storeRoles: StoreRole[];
}

interface AccessTokenPayload {
  sub: string;
  email: string;
  isSuperAdmin: boolean;
  storeRoles: StoreRole[];
}

/**
 * El refresh token vive **solo** en la cookie HttpOnly `mitama_refresh`
 * (r22 · sprint1_cierre): el admin no lo conoce ni lo persiste en
 * `localStorage`. Solo el `accessToken` (memoria del proceso JS) y los
 * metadatos del usuario / tienda activa cruzan a este store.
 */
interface AuthState {
  accessToken: string | null;
  user: SessionUser | null;
  activeStoreId: string | null;
  setSession: (input: { accessToken: string; name: string }) => void;
  setTokens: (accessToken: string) => void;
  setActiveStore: (storeId: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      activeStoreId: null,
      setSession: ({ accessToken, name }) => {
        const payload = decodeJwt<AccessTokenPayload>(accessToken);
        set({
          accessToken,
          user: {
            id: payload.sub,
            email: payload.email,
            name,
            isSuperAdmin: payload.isSuperAdmin,
            storeRoles: payload.storeRoles ?? [],
          },
          activeStoreId: payload.storeRoles?.[0]?.storeId ?? null,
        });
      },
      setTokens: (accessToken) => {
        const payload = decodeJwt<AccessTokenPayload>(accessToken);
        const current = get().user;
        if (!current) {
          return;
        }
        set({
          accessToken,
          user: { ...current, isSuperAdmin: payload.isSuperAdmin, storeRoles: payload.storeRoles ?? [] },
        });
      },
      setActiveStore: (storeId) => set({ activeStoreId: storeId }),
      logout: () => set({ accessToken: null, user: null, activeStoreId: null }),
    }),
    {
      name: 'mitama-admin-session',
      skipHydration: true,
      // Persistimos únicamente metadatos no sensibles. El refresh token
      // vive en cookie HttpOnly; el access token en memoria.
      partialize: (state) => ({
        user: state.user,
        activeStoreId: state.activeStoreId,
      }),
    },
  ),
);

export function hasPermission(user: SessionUser | null, permission: string, storeId?: string | null): boolean {
  if (!user) {
    return false;
  }
  if (user.isSuperAdmin) {
    return true;
  }
  if (storeId) {
    return user.storeRoles.some((role) => role.storeId === storeId && role.permissions.includes(permission));
  }
  return user.storeRoles.some((role) => role.permissions.includes(permission));
}

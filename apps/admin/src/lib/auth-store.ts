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

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  activeStoreId: string | null;
  setSession: (tokens: { accessToken: string; refreshToken: string }, name: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setActiveStore: (storeId: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      activeStoreId: null,
      setSession: ({ accessToken, refreshToken }, name) => {
        const payload = decodeJwt<AccessTokenPayload>(accessToken);
        set({
          accessToken,
          refreshToken,
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
      setTokens: (accessToken, refreshToken) => {
        const payload = decodeJwt<AccessTokenPayload>(accessToken);
        const current = get().user;
        if (!current) {
          return;
        }
        set({
          accessToken,
          refreshToken,
          user: { ...current, isSuperAdmin: payload.isSuperAdmin, storeRoles: payload.storeRoles ?? [] },
        });
      },
      setActiveStore: (storeId) => set({ activeStoreId: storeId }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null, activeStoreId: null }),
    }),
    {
      name: 'mitama-admin-session',
      skipHydration: true,
      partialize: (state) => ({
        refreshToken: state.refreshToken,
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

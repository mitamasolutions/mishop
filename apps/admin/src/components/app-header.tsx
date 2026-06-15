'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, LogOut, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuthStore } from '@/lib/auth-store';
import { listStores } from '@/lib/api/stores';
import { logout as logoutRequest } from '@/lib/api/auth';
import type { StoreOutput } from '@/lib/api/types';

export function AppHeader() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const activeStoreId = useAuthStore((state) => state.activeStoreId);
  const setActiveStore = useAuthStore((state) => state.setActiveStore);
  const logout = useAuthStore((state) => state.logout);
  const [stores, setStores] = useState<StoreOutput[]>([]);

  useEffect(() => {
    let active = true;
    listStores()
      .then((data) => {
        if (active) {
          setStores(data);
        }
      })
      .catch(() => {
        // El selector queda vacío si la petición falla; no es crítico para la sesión.
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleStores = user?.isSuperAdmin
    ? stores
    : stores.filter((store) => user?.storeRoles.some((role) => role.storeId === store.id));
  const activeStore = visibleStores.find((store) => store.id === activeStoreId);

  async function handleLogout(): Promise<void> {
    try {
      // La API lee el refresh de la cookie HttpOnly y la limpia. Si falla,
      // igual cerramos la sesión local.
      await logoutRequest();
    } catch {
      // ignorar errores de red
    }
    logout();
    router.replace('/login');
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Store className="h-4 w-4" />
            {activeStore ? activeStore.name : 'Sin tienda'}
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Tiendas</DropdownMenuLabel>
          {visibleStores.map((store) => (
            <DropdownMenuItem key={store.id} onSelect={() => setActiveStore(store.id)}>
              {store.name}
            </DropdownMenuItem>
          ))}
          {visibleStores.length === 0 && <DropdownMenuItem disabled>No tienes tiendas asignadas</DropdownMenuItem>}
          {user?.isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setActiveStore(null)}>Sin tienda (global)</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              {user?.name ?? user?.email}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

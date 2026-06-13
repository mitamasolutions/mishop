'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ClipboardList,
  Globe,
  LayoutDashboard,
  Map,
  MapPin,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { hasPermission, useAuthStore } from '@/lib/auth-store';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, permission: null },
  { href: '/usuarios', label: 'Usuarios', icon: Users, permission: 'users.read' },
  { href: '/roles', label: 'Roles', icon: ShieldCheck, permission: 'roles.read' },
  { href: '/tiendas', label: 'Tiendas', icon: Store, permission: 'stores.read' },
  { href: '/configuracion', label: 'Configuración', icon: Settings, permission: 'settings.read' },
  { href: '/actividad', label: 'Actividad', icon: ClipboardList, permission: 'activity-log.read' },
] as const;

const catalogoItems = [
  { href: '/catalogos/regiones', label: 'Regiones', icon: Globe, permission: 'regions.read' },
  { href: '/catalogos/territorios', label: 'Territorios', icon: Map, permission: 'territories.read' },
  { href: '/catalogos/zonas', label: 'Zonas', icon: MapPin, permission: 'zones.read' },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isCatalogosActive = pathname.startsWith('/catalogos');
  const [catalogosOpen, setCatalogosOpen] = useState(isCatalogosActive);

  const visibleCatalogos = catalogoItems.filter(
    (item) => !item.permission || hasPermission(user, item.permission),
  );

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <span className="text-lg font-bold tracking-tight">mitama</span>
      </div>
      <nav className="flex flex-col gap-1 p-3" aria-label="Navegación principal">
        {navItems
          .filter((item) => !item.permission || hasPermission(user, item.permission))
          .map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                  active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}

        {visibleCatalogos.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setCatalogosOpen((prev) => !prev)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                isCatalogosActive ? 'text-accent-foreground' : 'text-muted-foreground',
              )}
            >
              <Globe className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Catálogos</span>
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform duration-200', catalogosOpen && 'rotate-180')}
              />
            </button>

            {catalogosOpen && (
              <div className="ml-3 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                {visibleCatalogos.map(({ href, label, icon: Icon }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}

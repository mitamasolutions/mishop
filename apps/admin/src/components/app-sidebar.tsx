'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
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

export function AppSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

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
      </nav>
    </aside>
  );
}

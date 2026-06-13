'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  BadgePercent,
  Boxes,
  ChevronDown,
  ClipboardList,
  FolderTree,
  Globe,
  LayoutDashboard,
  Layers,
  Map,
  MapPin,
  Settings,
  Package,
  ShieldCheck,
  Store,
  Tag,
  Tags,
  Users,
  Warehouse,
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

const catalogItems = [
  { href: '/catalogos/productos', label: 'Productos', icon: Boxes, permission: 'products.read' },
  { href: '/catalogos/listas-precios', label: 'Listas de precios', icon: BadgePercent, permission: 'products.read' },
  { href: '/catalogos/marcas', label: 'Marcas', icon: Tag, permission: 'brands.read' },
  { href: '/catalogos/categorias', label: 'Categorías', icon: FolderTree, permission: 'categories.read' },
  { href: '/catalogos/tipos-producto', label: 'Tipos de producto', icon: Layers, permission: 'product-types.read' },
  { href: '/catalogos/etiquetas', label: 'Etiquetas', icon: Tags, permission: 'product-tags.read' },
  { href: '/catalogos/canales-venta', label: 'Canales de venta', icon: Store, permission: 'sales-channels.read' },
  { href: '/catalogos/colecciones', label: 'Colecciones', icon: Package, permission: 'collections.read' },
  { href: '/catalogos/regiones', label: 'Regiones', icon: Globe, permission: 'regions.read' },
  { href: '/catalogos/territorios', label: 'Territorios', icon: Map, permission: 'territories.read' },
  { href: '/catalogos/zonas', label: 'Zonas', icon: MapPin, permission: 'zones.read' },
] as const;

const inventoryItems = [
  { href: '/inventario/ubicaciones', label: 'Ubicaciones', icon: Warehouse, permission: 'inventory.read' },
  { href: '/inventario/bajo-stock', label: 'Bajo stock', icon: AlertTriangle, permission: 'inventory.read' },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  const isCatalogActive = catalogItems.some((item) => pathname.startsWith(item.href));
  const [catalogOpen, setCatalogOpen] = useState(isCatalogActive);

  const isInventoryActive = inventoryItems.some((item) => pathname.startsWith(item.href));
  const [inventoryOpen, setInventoryOpen] = useState(isInventoryActive);

  const visibleCatalog = catalogItems.filter(
    (item) => !item.permission || hasPermission(user, item.permission),
  );

  const visibleInventory = inventoryItems.filter(
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

        {visibleCatalog.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setCatalogOpen((prev) => !prev)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                isCatalogActive ? 'text-accent-foreground' : 'text-muted-foreground',
              )}
            >
              <Package className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Catálogo</span>
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform duration-200', catalogOpen && 'rotate-180')}
              />
            </button>

            {catalogOpen && (
              <div className="ml-3 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                {visibleCatalog.map(({ href, label, icon: Icon }) => {
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

        {visibleInventory.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setInventoryOpen((prev) => !prev)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                isInventoryActive ? 'text-accent-foreground' : 'text-muted-foreground',
              )}
            >
              <Warehouse className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Inventario</span>
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform duration-200', inventoryOpen && 'rotate-180')}
              />
            </button>

            {inventoryOpen && (
              <div className="ml-3 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                {visibleInventory.map(({ href, label, icon: Icon }) => {
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

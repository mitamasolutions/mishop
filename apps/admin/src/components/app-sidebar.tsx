import {
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Catálogo', icon: Package },
  { label: 'Órdenes', icon: ShoppingCart },
  { label: 'Clientes', icon: Users },
  { label: 'Configuración', icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <span className="text-lg font-bold tracking-tight">mitama</span>
      </div>
      <nav className="flex flex-col gap-1 p-3" aria-label="Navegación principal">
        {navItems.map(({ label, icon: Icon }) => (
          <a
            key={label}
            href="#"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Icon className="h-4 w-4" />
            {label}
          </a>
        ))}
      </nav>
    </aside>
  );
}

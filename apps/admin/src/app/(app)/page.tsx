'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, DollarSign, Receipt } from 'lucide-react';
import { listOrders } from '@/lib/api/orders';
import { listInventoryItems } from '@/lib/api/inventory';

interface KpiState {
  ordersToday: number;
  pendingPayment: number;
  lowStock: number;
  revenueToday: number;
  currencyCode: string;
}

/**
 * Dashboard con KPIs reales (r23 · sprint1_cierre). Calcula client-side
 * leyendo los endpoints paginados existentes: órdenes de hoy, pendientes
 * de pago, alertas de stock bajo e ingresos del día.
 */
export default function HomePage() {
  const [kpi, setKpi] = useState<KpiState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      // Órdenes recientes (ordenadas por fecha desc en backend); leemos
      // una página suficientemente grande para cubrir "hoy".
      listOrders({ pageSize: 100 }),
      // Pendientes de pago.
      listOrders({ paymentStatus: 'pending', pageSize: 1 }),
      // Stock para calcular alertas (umbral fijo 5 por simplicidad).
      listInventoryItems({ pageSize: 100 }),
    ])
      .then(([recent, pending, inventory]) => {
        if (cancelled) return;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const today = recent.items.filter((order) => new Date(order.createdAt) >= startOfDay);
        const revenueToday = today.reduce((sum, order) => sum + order.total, 0);
        const lowStock = inventory.items.reduce((count, item) => {
          // Umbral por defecto fijo: F5 hace una aproximación; un ajuste
          // server-side por variante (variant.lowStockThreshold) puede
          // venir en sprints futuros sin tocar el dashboard.
          const threshold = 5;
          const totalStocked = item.levels.reduce((sum, lvl) => sum + lvl.stockedQuantity - lvl.reservedQuantity, 0);
          return totalStocked <= threshold ? count + 1 : count;
        }, 0);
        setKpi({
          ordersToday: today.length,
          pendingPayment: pending.total,
          lowStock,
          revenueToday,
          currencyCode: today[0]?.currencyCode ?? recent.items[0]?.currencyCode ?? 'MXN',
        });
      })
      .catch(() => {
        // KPIs fallidos no rompen el dashboard; quedan en placeholder.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resumen</h1>
        <p className="mt-1 text-sm text-muted-foreground">Estado actual de la tienda activa.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Receipt}
          title="Órdenes de hoy"
          value={loading || !kpi ? '…' : String(kpi.ordersToday)}
          href="/ordenes"
        />
        <KpiCard
          icon={CheckCircle2}
          title="Pendientes de pago"
          value={loading || !kpi ? '…' : String(kpi.pendingPayment)}
          href="/ordenes?paymentStatus=pending"
        />
        <KpiCard
          icon={AlertTriangle}
          title="Alertas de stock bajo"
          value={loading || !kpi ? '…' : String(kpi.lowStock)}
          href="/inventario/bajo-stock"
        />
        <KpiCard
          icon={DollarSign}
          title="Ingresos del día"
          value={loading || !kpi ? '…' : `${kpi.revenueToday.toFixed(2)} ${kpi.currencyCode}`}
          href="/ordenes"
        />
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, title, value, href }: { icon: typeof Receipt; title: string; value: string; href: string }) {
  return (
    <Link href={href} className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-accent/30">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
    </Link>
  );
}

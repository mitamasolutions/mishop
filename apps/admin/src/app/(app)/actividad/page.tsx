'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';
import { listGlobalActivityLog, listStoreActivityLog, type ActivityLogFilters } from '@/lib/api/activity-log';
import type { ActivityLogPage } from '@/lib/api/types';

const EMPTY_PAGE: ActivityLogPage = { items: [], total: 0, page: 1, pageSize: 20 };

export default function ActivityLogPageRoute() {
  const user = useAuthStore((state) => state.user);
  const activeStoreId = useAuthStore((state) => state.activeStoreId);
  const [scope, setScope] = useState<'global' | 'store'>(user?.isSuperAdmin ? 'global' : 'store');
  const [filters, setFilters] = useState<ActivityLogFilters>({ page: 1 });
  const [data, setData] = useState<ActivityLogPage>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload(): Promise<void> {
    if (scope === 'store' && !activeStoreId) {
      setData(EMPTY_PAGE);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(scope === 'global' ? await listGlobalActivityLog(filters) : await listStoreActivityLog(filters));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el log de actividad');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [scope, activeStoreId, filters]);

  function updateFilter(key: keyof ActivityLogFilters, value: string): void {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Actividad</h1>
        <p className="mt-1 text-sm text-muted-foreground">Historial de cambios registrados en la plataforma.</p>
      </div>

      {user?.isSuperAdmin && (
        <div className="mt-4 flex gap-2">
          <Button variant={scope === 'global' ? 'default' : 'outline'} size="sm" onClick={() => setScope('global')}>
            Global
          </Button>
          <Button variant={scope === 'store' ? 'default' : 'outline'} size="sm" onClick={() => setScope('store')}>
            Tienda activa
          </Button>
        </div>
      )}

      {scope === 'store' && !activeStoreId && (
        <p className="mt-6 text-sm text-muted-foreground">
          Selecciona una tienda en el encabezado para ver su actividad.
        </p>
      )}

      {(scope === 'global' || activeStoreId) && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-entity">Entidad</Label>
              <Input id="filter-entity" placeholder="setting, store…" onChange={(event) => updateFilter('entityType', event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-action">Acción</Label>
              <Input id="filter-action" placeholder="setting.updated…" onChange={(event) => updateFilter('action', event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-from">Desde</Label>
              <Input id="filter-from" type="date" onChange={(event) => updateFilter('from', event.target.value ? new Date(event.target.value).toISOString() : '')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-to">Hasta</Label>
              <Input id="filter-to" type="date" onChange={(event) => updateFilter('to', event.target.value ? new Date(event.target.value).toISOString() : '')} />
            </div>
          </div>

          {error && <p className="mt-6 text-sm text-red-500">{error}</p>}

          {!error && (
            <div className="mt-6 rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-xs">{new Date(entry.createdAt).toLocaleString('es-MX')}</TableCell>
                      <TableCell>{entry.action}</TableCell>
                      <TableCell>
                        {entry.entityType} <span className="text-xs text-muted-foreground">{entry.entityId}</span>
                      </TableCell>
                      <TableCell className="text-xs">{entry.userId ?? 'Sistema'}</TableCell>
                      <TableCell>
                        {entry.diff ? <pre className="max-w-xs overflow-x-auto text-xs">{JSON.stringify(entry.diff)}</pre> : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && data.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No hay actividad registrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Página {data.page} de {totalPages} · {data.total} registros
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={data.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={data.page >= totalPages}
                onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

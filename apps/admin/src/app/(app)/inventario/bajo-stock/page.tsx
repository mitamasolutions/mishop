'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import { listInventoryItems, listStockLocations } from '@/lib/api/inventory';
import type { InventoryItemOutput, StockLocationOutput } from '@/lib/api/types';

const DEFAULT_THRESHOLD = 5;

export default function LowStockPage() {
  const [items, setItems] = useState<InventoryItemOutput[]>([]);
  const [locations, setLocations] = useState<StockLocationOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(String(DEFAULT_THRESHOLD));

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const [page, allLocations] = await Promise.all([
          listInventoryItems({ pageSize: 100 }),
          listStockLocations(),
        ]);
        setItems(page.items);
        setLocations(allLocations);
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : 'No se pudo cargar el inventario');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const numericThreshold = Number(threshold);
  const validThreshold = Number.isFinite(numericThreshold) ? numericThreshold : DEFAULT_THRESHOLD;

  function locationName(locationId: string): string {
    return locations.find((location) => location.id === locationId)?.name ?? locationId;
  }

  function totalAvailable(item: InventoryItemOutput): number {
    return item.levels.reduce((sum, level) => sum + level.availableQuantity, 0);
  }

  const lowStockItems = items
    .filter((item) => totalAvailable(item) <= validThreshold)
    .sort((a, b) => totalAvailable(a) - totalAvailable(b));

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alerta de stock bajo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ítems de inventario cuya cantidad disponible total está por debajo del umbral.
        </p>
      </div>

      <div className="mt-4 flex max-w-xs flex-col gap-1.5">
        <Label htmlFor="threshold">Umbral de cantidad disponible</Label>
        <Input
          id="threshold"
          type="number"
          min={0}
          value={threshold}
          onChange={(event) => setThreshold(event.target.value)}
        />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Disponible total</TableHead>
              <TableHead>Por ubicación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lowStockItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.sku ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{item.title ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    {totalAvailable(item)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {item.levels.length === 0
                    ? 'Sin niveles registrados'
                    : item.levels
                        .map((level) => `${locationName(level.locationId)}: ${level.availableQuantity}`)
                        .join(', ')}
                </TableCell>
              </TableRow>
            ))}
            {!loading && lowStockItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  No hay ítems por debajo del umbral.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

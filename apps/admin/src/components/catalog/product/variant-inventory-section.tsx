'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import {
  createInventoryItem,
  getInventoryItemByVariant,
  listStockLocations,
  removeInventoryLevel,
  setInventoryLevel,
} from '@/lib/api/inventory';
import type { InventoryItemOutput, ProductVariantOutput, StockLocationOutput } from '@/lib/api/types';

interface VariantInventorySectionProps {
  variant: ProductVariantOutput;
}

export function VariantInventorySection({ variant }: VariantInventorySectionProps) {
  const [item, setItem] = useState<InventoryItemOutput | null>(null);
  const [locations, setLocations] = useState<StockLocationOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      const [allLocations, inventoryItem] = await Promise.all([
        listStockLocations(),
        getInventoryItemByVariant(variant.id).catch((error) => {
          if (error instanceof ApiError && error.status === 404) {
            return null;
          }
          throw error;
        }),
      ]);
      setLocations(allLocations);
      setItem(inventoryItem);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo cargar el inventario de la variante');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [variant.id]);

  async function handleCreateItem(): Promise<void> {
    setCreating(true);
    try {
      await createInventoryItem({ variantId: variant.id, sku: variant.sku, title: variant.title });
      toast.success('Ítem de inventario creado');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo crear el ítem de inventario');
    } finally {
      setCreating(false);
    }
  }

  const totalAvailable = item ? item.levels.reduce((sum, level) => sum + level.availableQuantity, 0) : 0;
  const isLowStock = item !== null && variant.lowStockThreshold !== null && totalAvailable <= variant.lowStockThreshold;

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Inventario</h3>
        {isLowStock && (
          <Badge variant="outline" className="border-amber-500 text-amber-600">
            Stock bajo
          </Badge>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {!loading && !item && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Esta variante no tiene un ítem de inventario vinculado.</p>
          <Button size="sm" onClick={() => void handleCreateItem()} disabled={creating} className="self-start">
            {creating ? 'Creando…' : 'Crear ítem de inventario'}
          </Button>
        </div>
      )}

      {!loading && item && locations.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay ubicaciones de stock configuradas.</p>
      )}

      {!loading && item && locations.length > 0 && (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ubicación</TableHead>
                <TableHead>Existencias</TableHead>
                <TableHead>Reservado</TableHead>
                <TableHead>Entrante</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => {
                const level = item.levels.find((candidate) => candidate.locationId === location.id);
                return (
                  <InventoryLevelRow
                    key={location.id}
                    itemId={item.id}
                    locationName={location.name}
                    locationId={location.id}
                    level={level ?? null}
                    onUpdated={(updated) => setItem(updated)}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function InventoryLevelRow({
  itemId,
  locationId,
  locationName,
  level,
  onUpdated,
}: {
  itemId: string;
  locationId: string;
  locationName: string;
  level: InventoryItemOutput['levels'][number] | null;
  onUpdated: (item: InventoryItemOutput) => void;
}) {
  const [stockedQuantity, setStockedQuantity] = useState(level?.stockedQuantity?.toString() ?? '0');
  const [incomingQuantity, setIncomingQuantity] = useState(level?.incomingQuantity?.toString() ?? '0');
  const [saving, setSaving] = useState(false);

  async function handleSave(): Promise<void> {
    const stocked = Number(stockedQuantity);
    const incoming = Number(incomingQuantity);
    if (!Number.isInteger(stocked) || stocked < 0 || !Number.isInteger(incoming) || incoming < 0) {
      toast.error('Las cantidades deben ser enteros mayores o iguales a 0');
      return;
    }
    setSaving(true);
    try {
      const updated = await setInventoryLevel(itemId, locationId, {
        stockedQuantity: stocked,
        incomingQuantity: incoming,
      });
      onUpdated(updated);
      toast.success('Nivel de inventario actualizado');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo actualizar el nivel de inventario');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(): Promise<void> {
    if (!window.confirm(`¿Eliminar el nivel de inventario en "${locationName}"?`)) {
      return;
    }
    try {
      const updated = await removeInventoryLevel(itemId, locationId);
      onUpdated(updated);
      setStockedQuantity('0');
      setIncomingQuantity('0');
      toast.success('Nivel de inventario eliminado');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar el nivel de inventario');
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{locationName}</TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          value={stockedQuantity}
          onChange={(event) => setStockedQuantity(event.target.value)}
          className="w-24"
        />
      </TableCell>
      <TableCell className="text-muted-foreground">{level?.reservedQuantity ?? 0}</TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          value={incomingQuantity}
          onChange={(event) => setIncomingQuantity(event.target.value)}
          className="w-24"
        />
      </TableCell>
      <TableCell className="text-muted-foreground">{level?.availableQuantity ?? 0}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
          {level && (
            <Button size="sm" variant="outline" onClick={() => void handleRemove()}>
              Eliminar
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

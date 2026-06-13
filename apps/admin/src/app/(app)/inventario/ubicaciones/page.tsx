'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import { createStockLocation, listStockLocations, setStockLocationStatus, updateStockLocation } from '@/lib/api/inventory';
import type { StockLocationOutput } from '@/lib/api/types';

export default function StockLocationsPage() {
  const [locations, setLocations] = useState<StockLocationOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<StockLocationOutput | 'new' | null>(null);

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      setLocations(await listStockLocations());
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar las ubicaciones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleToggleStatus(location: StockLocationOutput): Promise<void> {
    try {
      await setStockLocationStatus(location.id, !location.isActive);
      toast.success(location.isActive ? 'Ubicación desactivada' : 'Ubicación activada');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo cambiar el estado');
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ubicaciones de stock</h1>
          <p className="mt-1 text-sm text-muted-foreground">Almacenes y tiendas donde se gestiona inventario.</p>
        </div>
        <Dialog open={editing === 'new'} onOpenChange={(open) => setEditing(open ? 'new' : null)}>
          <DialogTrigger asChild>
            <Button>Nueva ubicación</Button>
          </DialogTrigger>
          {editing === 'new' && (
            <StockLocationDialog
              location={null}
              onSuccess={() => {
                setEditing(null);
                void reload();
              }}
            />
          )}
        </Dialog>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id}>
                <TableCell className="font-medium">{location.name}</TableCell>
                <TableCell>
                  <Badge variant={location.isActive ? 'default' : 'muted'}>
                    {location.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Dialog open={editing === location} onOpenChange={(open) => setEditing(open ? location : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          Editar
                        </Button>
                      </DialogTrigger>
                      {editing === location && (
                        <StockLocationDialog
                          location={location}
                          onSuccess={() => {
                            setEditing(null);
                            void reload();
                          }}
                        />
                      )}
                    </Dialog>
                    <Button size="sm" variant="outline" onClick={() => void handleToggleStatus(location)}>
                      {location.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && locations.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  No hay ubicaciones de stock.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StockLocationDialog({
  location,
  onSuccess,
}: {
  location: StockLocationOutput | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(location?.name ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      if (location) {
        await updateStockLocation(location.id, { name });
      } else {
        await createStockLocation({ name });
      }
      toast.success('Ubicación guardada');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar la ubicación');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{location ? `Editar ${location.name}` : 'Nueva ubicación'}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="location-name">Nombre</Label>
          <Input id="location-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

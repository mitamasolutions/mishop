'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import { createShipment, listShipmentsByOrder, updateShipmentStatus, type ShipmentOutput, type ShipmentStatus } from '@/lib/api/shipping';
import { hasPermission, useAuthStore } from '@/lib/auth-store';

const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: 'Pendiente',
  shipped: 'Enviado',
  in_transit: 'En tránsito',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

interface Props {
  orderId: string;
}

/**
 * Tab Envíos en el detalle de orden (r23 · sprint1_cierre). El MVP soporta
 * un único shipment por orden; permite crearlo con tracking + carrier y
 * actualizar su estado (que dispara la notificación al cliente vía evento).
 */
export function OrderShipmentsSection({ orderId }: Props) {
  const [items, setItems] = useState<ShipmentOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState('');
  const [carrier, setCarrier] = useState('');
  const [editingFor, setEditingFor] = useState<ShipmentOutput | null>(null);
  const [editStatus, setEditStatus] = useState<ShipmentStatus>('pending');
  const [busy, setBusy] = useState(false);
  const user = useAuthStore((state) => state.user);
  const activeStoreId = useAuthStore((state) => state.activeStoreId);
  const canCreate = hasPermission(user, 'shipments.create', activeStoreId);
  const canUpdate = hasPermission(user, 'shipments.update', activeStoreId);

  const refresh = () => {
    setLoading(true);
    return listShipmentsByOrder(orderId)
      .then(setItems)
      .catch((error: unknown) => toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar los envíos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void refresh();
  }, [orderId]);

  async function handleCreate() {
    setBusy(true);
    try {
      await createShipment({ orderId, trackingNumber: tracking || null, carrier: carrier || null });
      toast.success('Envío creado');
      setTracking('');
      setCarrier('');
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo crear el envío');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate() {
    if (!editingFor) return;
    setBusy(true);
    try {
      await updateShipmentStatus(editingFor.id, { status: editStatus, trackingNumber: editingFor.trackingNumber, carrier: editingFor.carrier });
      toast.success(`Envío actualizado a ${SHIPMENT_STATUS_LABELS[editStatus]}`);
      setEditingFor(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo actualizar el envío');
    } finally {
      setBusy(false);
    }
  }

  const hasShipment = items.length > 0;

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <h2 className="text-sm font-semibold">Envíos</h2>
          <p className="text-xs text-muted-foreground">En el MVP cada orden tiene un único envío.</p>
        </div>
      </div>

      {!hasShipment && canCreate && (
        <div className="space-y-3 border-b border-border p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="tracking">Número de guía</Label>
              <Input id="tracking" value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="XYZ-123" />
            </div>
            <div>
              <Label htmlFor="carrier">Paquetería</Label>
              <Input id="carrier" value={carrier} onChange={(event) => setCarrier(event.target.value)} placeholder="DHL, Estafeta…" />
            </div>
          </div>
          <Button onClick={() => void handleCreate()} disabled={busy}>
            Crear envío
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Guía</TableHead>
            <TableHead>Paquetería</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Fecha</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && !hasShipment ? (
            <TableRow>
              <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                Cargando…
              </TableCell>
            </TableRow>
          ) : !hasShipment ? (
            <TableRow>
              <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                Sin envíos creados
              </TableCell>
            </TableRow>
          ) : (
            items.map((shipment) => (
              <TableRow key={shipment.id}>
                <TableCell className="font-medium">{shipment.trackingNumber ?? '—'}</TableCell>
                <TableCell>{shipment.carrier ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{SHIPMENT_STATUS_LABELS[shipment.status]}</Badge>
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {new Date(shipment.updatedAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {canUpdate && (
                    <div className="flex items-center justify-end gap-2">
                      <Select
                        value={editingFor?.id === shipment.id ? editStatus : shipment.status}
                        onValueChange={(value) => {
                          setEditingFor(shipment);
                          setEditStatus(value as ShipmentStatus);
                        }}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(SHIPMENT_STATUS_LABELS) as ShipmentStatus[]).map((value) => (
                            <SelectItem key={value} value={value}>
                              {SHIPMENT_STATUS_LABELS[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || editingFor?.id !== shipment.id || editStatus === shipment.status}
                        onClick={() => void handleUpdate()}
                      >
                        Aplicar
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}

'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';
import {
  addOrderNote,
  cancelOrder,
  changeOrderState,
  changePaymentState,
  getOrder,
  resendOrderConfirmation,
} from '@/lib/api/orders';
import type { OrderOutput, OrderPaymentStatus, OrderStatus } from '@/lib/api/types';

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const PAYMENT_TRANSITIONS: Record<OrderPaymentStatus, OrderPaymentStatus[]> = {
  pending: ['authorized', 'paid', 'failed', 'cancelled'],
  authorized: ['paid', 'failed', 'voided', 'cancelled'],
  paid: ['partially_refunded', 'refunded', 'failed'],
  partially_refunded: ['refunded'],
  refunded: [],
  voided: [],
  cancelled: [],
  failed: [],
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const PAYMENT_STATUS_LABELS: Record<OrderPaymentStatus, string> = {
  pending: 'Pendiente',
  authorized: 'Autorizado',
  paid: 'Pagado',
  partially_refunded: 'Reembolso parcial',
  refunded: 'Reembolsado',
  failed: 'Fallido',
  voided: 'Anulado',
  cancelled: 'Cancelado',
};

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default function OrderDetailPage({ params }: PageProps) {
  const { orderId } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteBody, setNoteBody] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOrder(orderId);
      setOrder(result);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo cargar la orden');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function withBusy<T>(fn: () => Promise<T>, successMessage: string): Promise<T | null> {
    setBusy(true);
    try {
      const result = await fn();
      toast.success(successMessage);
      await refresh();
      return result;
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Operación inválida');
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (loading && !order) {
    return <p className="text-sm text-muted-foreground">Cargando orden…</p>;
  }
  if (!order) {
    return <p className="text-sm text-muted-foreground">Orden no encontrada.</p>;
  }

  const nextOrderStates = ORDER_TRANSITIONS[order.status];
  const nextPaymentStates = PAYMENT_TRANSITIONS[order.paymentStatus];
  const shippingAddress = order.shippingAddress as Record<string, string | null>;
  const billingAddress = order.billingAddress as Record<string, string | null>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Orden</p>
          <h1 className="text-2xl font-bold tracking-tight">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Creada {new Date(order.createdAt).toLocaleString()} · canal {order.channel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="muted">{ORDER_STATUS_LABELS[order.status]}</Badge>
          <Badge variant="outline">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {order.total.toFixed(2)} {order.currencyCode}
          </p>
          <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{order.subtotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Envío</dt>
              <dd className="tabular-nums">{order.shippingTotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Impuestos</dt>
              <dd className="tabular-nums">{order.taxTotal.toFixed(2)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Cliente</p>
          <p className="mt-1 font-medium">{order.customerEmail ?? 'Sin email'}</p>
          <p className="text-xs text-muted-foreground">{order.customerId}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Acciones</p>
          <div className="mt-2 flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => withBusy(() => resendOrderConfirmation(order.id), 'Confirmación reenviada')}
            >
              Reenviar confirmación
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={busy || order.status === 'completed' || order.status === 'cancelled'}
              onClick={() => setCancelOpen(true)}
            >
              Cancelar orden
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TransitionCard
          title="Cambiar estado de orden"
          options={nextOrderStates}
          labels={ORDER_STATUS_LABELS}
          disabled={busy || nextOrderStates.length === 0}
          onSubmit={(to, reason) => withBusy(() => changeOrderState(order.id, { to, reason }), 'Estado actualizado')}
        />
        <TransitionCard
          title="Cambiar estado de pago"
          options={nextPaymentStates}
          labels={PAYMENT_STATUS_LABELS}
          disabled={busy || nextPaymentStates.length === 0}
          onSubmit={(to, reason) => withBusy(() => changePaymentState(order.id, { to, reason }), 'Estado de pago actualizado')}
        />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold">Líneas</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <p className="font-medium">{line.productTitle}</p>
                  <p className="text-xs text-muted-foreground">{line.variantTitle}</p>
                </TableCell>
                <TableCell className="text-xs">{line.sku}</TableCell>
                <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">{line.unitPrice.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{line.total.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AddressCard title="Envío" address={shippingAddress} />
        <AddressCard title="Facturación" address={billingAddress} />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Notas</h2>
        <div className="mt-3 space-y-3">
          {order.notes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin notas internas.</p>
          ) : (
            order.notes.map((note) => (
              <div key={note.id} className="rounded-md border border-border p-3">
                <p className="text-sm">{note.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {note.authorId} · {new Date(note.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="note">Nueva nota</Label>
          <Textarea id="note" value={noteBody} onChange={(event) => setNoteBody(event.target.value)} rows={3} />
          <Button
            size="sm"
            disabled={busy || noteBody.trim().length === 0}
            onClick={async () => {
              const result = await withBusy(() => addOrderNote(order.id, noteBody.trim()), 'Nota agregada');
              if (result) setNoteBody('');
            }}
          >
            Agregar nota
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Historial</h2>
        <ol className="mt-3 space-y-2 text-xs">
          {order.transitions.length === 0 ? (
            <li className="text-muted-foreground">Sin transiciones registradas.</li>
          ) : (
            order.transitions.map((transition) => (
              <li key={transition.id} className="flex flex-wrap gap-2 text-muted-foreground">
                <span className="font-mono">{new Date(transition.createdAt).toLocaleString()}</span>
                <span>
                  [{transition.kind}] {transition.from} → {transition.to}
                </span>
                {transition.reason && <span className="italic">— {transition.reason}</span>}
              </li>
            ))
          )}
        </ol>
      </div>

      <div>
        <Link href="/ordenes" className="text-xs text-muted-foreground hover:underline">
          ← Volver a órdenes
        </Link>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar orden {order.orderNumber}</DialogTitle>
            <DialogDescription>Libera las reservas de stock asociadas. La acción no es reversible.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cancelReason">Motivo (opcional)</Label>
            <Textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setCancelOpen(false)}>
              Volver
            </Button>
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={busy}
              onClick={async () => {
                const result = await withBusy(
                  () => cancelOrder(order.id, cancelReason.trim() || null),
                  'Orden cancelada',
                );
                if (result) {
                  setCancelOpen(false);
                  setCancelReason('');
                  router.refresh();
                }
              }}
            >
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TransitionCardProps<T extends string> {
  title: string;
  options: readonly T[];
  labels: Record<T, string>;
  disabled?: boolean;
  onSubmit: (to: T, reason: string | null) => Promise<unknown>;
}

function TransitionCard<T extends string>({ title, options, labels, disabled, onSubmit }: TransitionCardProps<T>) {
  const [target, setTarget] = useState<T | ''>('');
  const [reason, setReason] = useState('');

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {options.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Sin transiciones disponibles.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <Select value={target} onValueChange={(value) => setTarget(value as T)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el nuevo estado" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {labels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label htmlFor={`${title}-reason`} className="text-xs">
            Motivo (opcional)
          </Label>
          <Textarea
            id={`${title}-reason`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
          />
          <Button
            size="sm"
            disabled={disabled || !target}
            onClick={async () => {
              if (!target) return;
              const result = await onSubmit(target, reason.trim() || null);
              if (result) {
                setReason('');
                setTarget('');
              }
            }}
          >
            Aplicar
          </Button>
        </div>
      )}
    </div>
  );
}

function AddressCard({ title, address }: { title: string; address: Record<string, string | null> }) {
  const empty = !address || Object.keys(address).length === 0;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      {empty ? (
        <p className="mt-2 text-sm text-muted-foreground">Sin dirección registrada.</p>
      ) : (
        <dl className="mt-2 grid grid-cols-3 gap-1 text-xs">
          {Object.entries(address).map(([key, value]) => (
            <div key={key} className="col-span-3 flex justify-between gap-3 border-b border-border/50 py-1 last:border-none">
              <dt className="text-muted-foreground">{key}</dt>
              <dd className="text-right">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

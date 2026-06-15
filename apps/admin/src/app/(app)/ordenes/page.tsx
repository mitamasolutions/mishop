'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import { listOrders } from '@/lib/api/orders';
import type { OrderOutput, OrderPaymentStatus, OrderStatus } from '@/lib/api/types';

const STATUS_ALL = '__all__';

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const ORDER_STATUS_VARIANT: Record<OrderStatus, 'default' | 'muted' | 'outline'> = {
  pending: 'muted',
  confirmed: 'default',
  completed: 'outline',
  cancelled: 'muted',
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

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>(STATUS_ALL);
  const [paymentStatus, setPaymentStatus] = useState<string>(STATUS_ALL);
  const [items, setItems] = useState<OrderOutput[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listOrders({
      orderNumber: search || undefined,
      status: status === STATUS_ALL ? undefined : (status as OrderStatus),
      paymentStatus: paymentStatus === STATUS_ALL ? undefined : (paymentStatus as OrderPaymentStatus),
    })
      .then((result) => {
        if (!cancelled) setItems(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar las órdenes');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, status, paymentStatus]);

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Órdenes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Listado de órdenes de la tienda activa.</p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Buscar por número de orden…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_ALL}>Todos los estados</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Estado de pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_ALL}>Cualquier pago</SelectItem>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Sin órdenes
                </TableCell>
              </TableRow>
            ) : (
              items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <Link href={`/ordenes/${order.id}`} className="hover:underline">
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">{order.channel}</p>
                  </TableCell>
                  <TableCell>{order.customerEmail ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={ORDER_STATUS_VARIANT[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {order.total.toFixed(2)} {order.currencyCode}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

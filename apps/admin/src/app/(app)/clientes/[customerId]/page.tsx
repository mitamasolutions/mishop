'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import { getCustomer, type CustomerOutput } from '@/lib/api/customers';
import { listOrders } from '@/lib/api/orders';
import type { OrderOutput } from '@/lib/api/types';

interface PageProps {
  params: Promise<{ customerId: string }>;
}

export default function CustomerDetailPage({ params }: PageProps) {
  const { customerId } = use(params);
  const [customer, setCustomer] = useState<CustomerOutput | null>(null);
  const [orders, setOrders] = useState<OrderOutput[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getCustomer(customerId), listOrders({ customerId, pageSize: 50 })])
      .then(([c, ordersResult]) => {
        if (cancelled) return;
        setCustomer(c);
        setOrders(ordersResult.items);
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(error instanceof ApiError ? error.message : 'No se pudo cargar el cliente');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (loading) return <p className="mx-auto max-w-5xl text-sm text-muted-foreground">Cargando…</p>;
  if (!customer) return <p className="mx-auto max-w-5xl text-sm text-muted-foreground">Cliente no encontrado.</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver
      </Link>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{customer.email}</p>
        </div>
        <Badge variant={customer.isGuest ? 'muted' : 'default'}>{customer.isGuest ? 'Invitado' : 'Registrado'}</Badge>
      </header>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Direcciones ({customer.addresses.length})</h2>
        {customer.addresses.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Sin direcciones</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {customer.addresses.map((address) => (
              <li key={address.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {address.firstName} {address.lastName}
                  </span>
                  {address.isDefaultShipping && <Badge variant="outline">Envío</Badge>}
                  {address.isDefaultBilling && <Badge variant="outline">Facturación</Badge>}
                </div>
                <p className="mt-1 text-muted-foreground">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}, {address.city}
                  {address.province ? `, ${address.province}` : ''} {address.postalCode ?? ''} · {address.countryCode}
                </p>
                {address.phone && <p className="text-xs text-muted-foreground">Tel: {address.phone}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="text-sm font-semibold">Historial de órdenes ({orders.length})</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  Sin órdenes
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <Link href={`/ordenes/${order.id}`} className="hover:underline">
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="muted">{order.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.paymentStatus}</Badge>
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
      </section>
    </div>
  );
}

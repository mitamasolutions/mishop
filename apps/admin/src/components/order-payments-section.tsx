'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import { listPaymentsByOrder, markPaymentPaid, refundPayment, type PaymentOutput } from '@/lib/api/payments';
import { hasPermission, useAuthStore } from '@/lib/auth-store';

interface Props {
  orderId: string;
  currency: string;
}

/**
 * Tab Pagos en el detalle de una orden (r23 · sprint1_cierre).
 * Muestra los intentos con su estado y proveedor, y acciones de
 * "marcar como pagado" (manual) y reembolso (parcial/total), siempre
 * gateadas por permiso (hasPermission).
 */
export function OrderPaymentsSection({ orderId, currency }: Props) {
  const [items, setItems] = useState<PaymentOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundFor, setRefundFor] = useState<PaymentOutput | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const user = useAuthStore((state) => state.user);
  const activeStoreId = useAuthStore((state) => state.activeStoreId);

  const canMarkPaid = hasPermission(user, 'payments.update', activeStoreId);
  const canRefund = hasPermission(user, 'payments.refund', activeStoreId);

  const refresh = () => {
    setLoading(true);
    return listPaymentsByOrder(orderId)
      .then(setItems)
      .catch((error: unknown) => toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar los pagos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void refresh();
  }, [orderId]);

  async function withBusy(label: string, action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      toast.success(label);
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Operación fallida');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <h2 className="text-sm font-semibold">Pagos</h2>
          <p className="text-xs text-muted-foreground">Intentos de pago de esta orden.</p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Proveedor</TableHead>
            <TableHead>Referencia</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="text-right">Reembolsos</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                Cargando…
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                Sin intentos de pago
              </TableCell>
            </TableRow>
          ) : (
            items.map((payment) => {
              const refunded = payment.refunds.filter((r) => r.status === 'succeeded').reduce((sum, r) => sum + r.amount, 0);
              const refundable = payment.status === 'paid' || payment.status === 'partially_refunded';
              return (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.providerCode}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{payment.providerReference ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{payment.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {payment.amount.toFixed(2)} {payment.currency}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                    {refunded.toFixed(2)} / {payment.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {canMarkPaid && payment.status === 'pending' && payment.providerCode === 'manual' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => withBusy('Pago marcado como pagado', () => markPaymentPaid(payment.id).then(() => undefined))}
                      >
                        Marcar pagado
                      </Button>
                    )}
                    {canRefund && refundable && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        className="ml-2"
                        onClick={() => {
                          setRefundFor(payment);
                          setRefundAmount((payment.amount - refunded).toFixed(2));
                        }}
                      >
                        Reembolsar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <Dialog open={refundFor !== null} onOpenChange={(open) => !open && setRefundFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reembolsar pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="refund-amount">Monto a reembolsar ({currency})</Label>
            <Input
              id="refund-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={refundAmount}
              onChange={(event) => setRefundAmount(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              El reembolso se enviará al proveedor; al agotar el saldo, la orden pasa a reembolsada.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundFor(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              disabled={busy || !refundFor || Number(refundAmount) <= 0}
              onClick={() => {
                if (!refundFor) return;
                void withBusy('Reembolso solicitado', async () => {
                  await refundPayment(refundFor.id, Number(refundAmount));
                  setRefundFor(null);
                });
              }}
            >
              Confirmar reembolso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

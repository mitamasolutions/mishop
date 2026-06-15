'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';
import { configurePaymentMethod, listAdminPaymentMethods, type AdminPaymentMethod, type PaymentMethodFieldDescriptor } from '@/lib/api/payments';
import { hasPermission, useAuthStore } from '@/lib/auth-store';

/**
 * Configuración de métodos de pago por tienda (r14 + r23 · sprint1_cierre).
 *
 * Lee el descriptor del plugin (campos requeridos), renderiza el formulario,
 * y muestra alerta si el método está habilitado pero mal configurado.
 */
export default function PaymentMethodsConfigPage() {
  const [items, setItems] = useState<AdminPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const activeStoreId = useAuthStore((state) => state.activeStoreId);
  const canEdit = hasPermission(user, 'settings.update', activeStoreId);

  const refresh = () => {
    setLoading(true);
    return listAdminPaymentMethods()
      .then(setItems)
      .catch((error: unknown) => toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar métodos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void refresh();
  }, [activeStoreId]);

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Métodos de pago</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Activa y configura los plugins de pago para esta tienda. Las credenciales se cifran (AES-256-GCM).
        </p>
      </div>

      {loading && items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          No hay métodos configurados en esta tienda. Habilita uno desde tu tabla de
          <code className="mx-1 rounded bg-muted px-1">store_payment_methods</code>
          (o desde la UI de tiendas si está creada).
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <MethodCard key={item.method.providerCode} item={item} canEdit={canEdit} onSaved={() => void refresh()} />
          ))}
        </div>
      )}
    </div>
  );
}

function MethodCard({ item, canEdit, onSaved }: { item: AdminPaymentMethod; canEdit: boolean; onSaved: () => void }) {
  const { method, status, misconfigurationReason, descriptor } = item;
  const [enabled, setEnabled] = useState(method.enabled);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [captureMode, setCaptureMode] = useState<'manual' | 'automatic'>(method.captureMode);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setBusy(true);
    try {
      await configurePaymentMethod(method.providerCode, {
        enabled,
        captureMode,
        webhookSecret: webhookSecret ? webhookSecret : undefined,
        credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
      });
      toast.success('Método actualizado');
      setWebhookSecret('');
      setCredentials({});
      onSaved();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <header className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold">{method.displayName}</h3>
          <p className="text-xs text-muted-foreground">{method.providerCode}</p>
        </div>
        <div className="flex items-center gap-2">
          {status === 'configured' ? (
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Configurado
            </Badge>
          ) : (
            <Badge variant="muted" className="gap-1 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> Mal configurado
            </Badge>
          )}
        </div>
      </header>

      {status === 'misconfigured' && misconfigurationReason && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          {misconfigurationReason} — el método NO aparece en el selector de checkout hasta corregirlo.
        </p>
      )}

      <fieldset className="mt-4 space-y-4" disabled={!canEdit || busy}>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={enabled} onCheckedChange={(value) => setEnabled(value === true)} />
          Habilitado en la tienda
        </label>

        <div>
          <Label htmlFor={`${method.providerCode}-capture`}>Modo de captura</Label>
          <select
            id={`${method.providerCode}-capture`}
            value={captureMode}
            onChange={(event) => setCaptureMode(event.target.value as 'manual' | 'automatic')}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="automatic">Automática (sale)</option>
            <option value="manual">Manual (authorize → capture)</option>
          </select>
        </div>

        <div>
          <Label htmlFor={`${method.providerCode}-secret`}>Webhook secret</Label>
          <Input
            id={`${method.providerCode}-secret`}
            type="password"
            placeholder="Dejar vacío para no modificar"
            value={webhookSecret}
            onChange={(event) => setWebhookSecret(event.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            URL del webhook: <code className="rounded bg-muted px-1">/v1/payments/webhooks/{method.providerCode}/{method.providerCode}</code>
          </p>
        </div>

        {descriptor && descriptor.fields.length > 0 && (
          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credenciales del proveedor</p>
            {descriptor.fields.map((field: PaymentMethodFieldDescriptor) => (
              <div key={field.key}>
                <Label htmlFor={`${method.providerCode}-${field.key}`}>
                  {field.label}
                  {field.required && <span className="ml-1 text-destructive">*</span>}
                </Label>
                <Input
                  id={`${method.providerCode}-${field.key}`}
                  type={field.type === 'secret' ? 'password' : 'text'}
                  placeholder="Dejar vacío para no modificar"
                  value={credentials[field.key] ?? ''}
                  onChange={(event) => setCredentials((prev) => ({ ...prev, [field.key]: event.target.value }))}
                />
                {field.description && <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>}
              </div>
            ))}
          </div>
        )}

        <Button onClick={() => void handleSave()} disabled={!canEdit || busy}>
          Guardar
        </Button>
      </fieldset>
    </article>
  );
}

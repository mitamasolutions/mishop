'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { hasPermission, useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';
import { listGlobalSettings, listStoreSettings, updateGlobalSetting, updateStoreSetting } from '@/lib/api/settings';
import type { SettingOutput } from '@/lib/api/types';

const SOURCE_LABELS: Record<SettingOutput['source'], string> = {
  override: 'Personalizado',
  global: 'Global',
  default: 'Predeterminado',
};

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const activeStoreId = useAuthStore((state) => state.activeStoreId);
  const [scope, setScope] = useState<'global' | 'store'>('global');
  const [settings, setSettings] = useState<SettingOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canUpdate = hasPermission(user, 'settings.update', scope === 'store' ? activeStoreId : null);

  async function reload(): Promise<void> {
    if (scope === 'store' && !activeStoreId) {
      setSettings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSettings(scope === 'global' ? await listGlobalSettings() : await listStoreSettings());
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo cargar la configuración';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [scope, activeStoreId]);

  async function handleSave(key: string, value: unknown): Promise<void> {
    try {
      if (scope === 'global') {
        await updateGlobalSetting(key, value);
      } else {
        await updateStoreSetting(key, value);
      }
      toast.success('Configuración actualizada');
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar el valor');
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ajustes globales y por tienda.</p>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant={scope === 'global' ? 'default' : 'outline'} size="sm" onClick={() => setScope('global')}>
          Global
        </Button>
        <Button variant={scope === 'store' ? 'default' : 'outline'} size="sm" onClick={() => setScope('store')}>
          Tienda activa
        </Button>
      </div>

      {scope === 'store' && !activeStoreId && (
        <p className="mt-6 text-sm text-muted-foreground">
          Selecciona una tienda en el encabezado para ver su configuración.
        </p>
      )}

      {error && <p className="mt-6 text-sm text-red-500">{error}</p>}

      {!error && (scope === 'global' || activeStoreId) && (
        <div className="mt-6 rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clave</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map((setting) => (
                <SettingRow key={setting.key} setting={setting} canUpdate={canUpdate} onSave={handleSave} />
              ))}
              {!loading && settings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    No hay configuraciones.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function SettingRow({
  setting,
  canUpdate,
  onSave,
}: {
  setting: SettingOutput;
  canUpdate: boolean;
  onSave: (key: string, value: unknown) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => serializeValue(setting));
  const [saving, setSaving] = useState(false);

  function startEdit(): void {
    setDraft(serializeValue(setting));
    setEditing(true);
  }

  async function handleSave(): Promise<void> {
    let parsed: unknown;
    try {
      parsed = parseValue(setting.type, draft);
    } catch {
      toast.error('El valor no es válido para este tipo');
      return;
    }
    setSaving(true);
    try {
      await onSave(setting.key, parsed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {setting.key}
        <div className="text-xs text-muted-foreground">{setting.type}</div>
      </TableCell>
      <TableCell>
        {editing ? (
          setting.type === 'boolean' ? (
            <Checkbox checked={draft === 'true'} onCheckedChange={(checked) => setDraft(checked ? 'true' : 'false')} />
          ) : setting.type === 'json' ? (
            <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="font-mono text-xs" />
          ) : (
            <Input
              type={setting.type === 'number' ? 'number' : 'text'}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          )
        ) : (
          <code className="text-xs">{serializeValue(setting)}</code>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline">{SOURCE_LABELS[setting.source]}</Badge>
      </TableCell>
      <TableCell className="text-right">
        {canUpdate &&
          (editing ? (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={startEdit}>
              Editar
            </Button>
          ))}
      </TableCell>
    </TableRow>
  );
}

function serializeValue(setting: SettingOutput): string {
  if (setting.type === 'json') {
    return JSON.stringify(setting.value, null, 2);
  }
  return String(setting.value);
}

function parseValue(type: SettingOutput['type'], raw: string): unknown {
  switch (type) {
    case 'number': {
      const value = Number(raw);
      if (Number.isNaN(value)) {
        throw new Error('Número inválido');
      }
      return value;
    }
    case 'boolean':
      return raw === 'true';
    case 'json':
      return JSON.parse(raw);
    default:
      return raw;
  }
}

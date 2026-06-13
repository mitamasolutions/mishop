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
import { createSalesChannel, listSalesChannels, setSalesChannelStatus, updateSalesChannel } from '@/lib/api/catalog';
import type { SalesChannelOutput } from '@/lib/api/types';

export default function SalesChannelsPage() {
  const [channels, setChannels] = useState<SalesChannelOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SalesChannelOutput | 'new' | null>(null);

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      setChannels(await listSalesChannels());
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar los canales de venta');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleToggleStatus(channel: SalesChannelOutput): Promise<void> {
    try {
      await setSalesChannelStatus(channel.id, !channel.isActive);
      toast.success(channel.isActive ? 'Canal desactivado' : 'Canal activado');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo cambiar el estado');
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Canales de venta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Canales mediante los que se venden los productos.</p>
        </div>
        <Dialog open={editing === 'new'} onOpenChange={(open) => setEditing(open ? 'new' : null)}>
          <DialogTrigger asChild>
            <Button>Nuevo canal</Button>
          </DialogTrigger>
          {editing === 'new' && (
            <SalesChannelDialog
              channel={null}
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
              <TableHead>Descripción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((channel) => (
              <TableRow key={channel.id}>
                <TableCell className="font-medium">{channel.name}</TableCell>
                <TableCell className="text-muted-foreground">{channel.description ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={channel.isActive ? 'default' : 'muted'}>
                    {channel.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Dialog open={editing === channel} onOpenChange={(open) => setEditing(open ? channel : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          Editar
                        </Button>
                      </DialogTrigger>
                      {editing === channel && (
                        <SalesChannelDialog
                          channel={channel}
                          onSuccess={() => {
                            setEditing(null);
                            void reload();
                          }}
                        />
                      )}
                    </Dialog>
                    <Button size="sm" variant="outline" onClick={() => void handleToggleStatus(channel)}>
                      {channel.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && channels.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  No hay canales de venta.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SalesChannelDialog({
  channel,
  onSuccess,
}: {
  channel: SalesChannelOutput | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(channel?.name ?? '');
  const [description, setDescription] = useState(channel?.description ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      if (channel) {
        await updateSalesChannel(channel.id, { name, description: description || undefined });
      } else {
        await createSalesChannel({ name, description: description || undefined });
      }
      toast.success('Canal de venta guardado');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar el canal de venta');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{channel ? `Editar ${channel.name}` : 'Nuevo canal de venta'}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="channel-name">Nombre</Label>
          <Input id="channel-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="channel-description">Descripción (opcional)</Label>
          <Input
            id="channel-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
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

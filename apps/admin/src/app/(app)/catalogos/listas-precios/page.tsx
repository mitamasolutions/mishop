'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import { createPriceList, listPriceLists, setPriceListStatus } from '@/lib/api/catalog';
import type { ListPriceListsOutput, PriceListType } from '@/lib/api/types';

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<PriceListType, string> = {
  sale: 'Promoción',
  override: 'Override',
};

export default function PriceListsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListPriceListsOutput>({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      setData(await listPriceLists({ page, pageSize: PAGE_SIZE }));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar las listas de precios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [page]);

  async function handleToggleStatus(id: string, status: 'draft' | 'active'): Promise<void> {
    try {
      await setPriceListStatus(id, status === 'active' ? 'draft' : 'active');
      toast.success(status === 'active' ? 'Lista desactivada' : 'Lista activada');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo cambiar el estado');
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Listas de precios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Campañas y overrides de precios por variante.</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button>Nueva lista</Button>
          </DialogTrigger>
          {creating && (
            <CreatePriceListDialog
              onSuccess={() => {
                setCreating(false);
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
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((priceList) => (
              <TableRow key={priceList.id}>
                <TableCell className="font-medium">
                  <Link href={`/catalogos/listas-precios/${priceList.id}`} className="hover:underline">
                    {priceList.title}
                  </Link>
                  {priceList.description && <p className="text-xs text-muted-foreground">{priceList.description}</p>}
                </TableCell>
                <TableCell className="text-muted-foreground">{TYPE_LABELS[priceList.type]}</TableCell>
                <TableCell>
                  <Badge variant={priceList.status === 'active' ? 'default' : 'muted'}>
                    {priceList.status === 'active' ? 'Activa' : 'Borrador'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {priceList.startsAt ? new Date(priceList.startsAt).toLocaleDateString('es-MX') : '—'}
                  {' – '}
                  {priceList.endsAt ? new Date(priceList.endsAt).toLocaleDateString('es-MX') : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => void handleToggleStatus(priceList.id, priceList.status)}>
                      {priceList.status === 'active' ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Link href={`/catalogos/listas-precios/${priceList.id}`} className="inline-flex">
                      <Button size="sm" variant="outline">
                        Ver
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No hay listas de precios.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {data.page} de {totalPages} ({data.total} listas)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreatePriceListDialog({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PriceListType>('sale');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      await createPriceList({ title, description: description || undefined, type });
      toast.success('Lista de precios creada');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo crear la lista de precios');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nueva lista de precios</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price-list-title">Título</Label>
          <Input id="price-list-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price-list-description">Descripción (opcional)</Label>
          <Input id="price-list-description" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(value) => setType(value as PriceListType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sale">Promoción</SelectItem>
              <SelectItem value="override">Override</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Creando…' : 'Crear'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

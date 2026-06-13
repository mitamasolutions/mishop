'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
import {
  addPriceListPrice,
  deletePriceList,
  getPriceList,
  getProduct,
  listProducts,
  removePriceListPrice,
  setPriceListStatus,
  updatePriceList,
  updatePriceListPrice,
} from '@/lib/api/catalog';
import type { ListProductsOutputItem, PriceListOutput, PriceListPriceOutput, PriceListType } from '@/lib/api/types';

const TYPE_LABELS: Record<PriceListType, string> = {
  sale: 'Promoción',
  override: 'Override',
};

function toDateTimeInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export default function PriceListDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const priceListId = params.id;

  const [priceList, setPriceList] = useState<PriceListOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [variantLabels, setVariantLabels] = useState<Record<string, string>>({});

  async function reload(): Promise<void> {
    try {
      setPriceList(await getPriceList(priceListId));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo cargar la lista de precios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [priceListId]);

  async function handleToggleStatus(): Promise<void> {
    if (!priceList) return;
    try {
      await setPriceListStatus(priceList.id, priceList.status === 'active' ? 'draft' : 'active');
      toast.success(priceList.status === 'active' ? 'Lista desactivada' : 'Lista activada');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo cambiar el estado');
    }
  }

  async function handleDelete(): Promise<void> {
    if (!priceList) return;
    if (!window.confirm(`¿Eliminar la lista de precios "${priceList.title}"?`)) {
      return;
    }
    try {
      await deletePriceList(priceList.id);
      toast.success('Lista de precios eliminada');
      router.push('/catalogos/listas-precios');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar la lista de precios');
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl text-sm text-muted-foreground">Cargando…</div>;
  }

  if (!priceList) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-muted-foreground">La lista de precios no existe.</p>
        <Link href="/catalogos/listas-precios" className="mt-4 inline-block text-sm underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/catalogos/listas-precios" className="text-sm text-muted-foreground hover:underline">
            ← Listas de precios
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{priceList.title}</h1>
            <Badge variant={priceList.status === 'active' ? 'default' : 'muted'}>
              {priceList.status === 'active' ? 'Activa' : 'Borrador'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {TYPE_LABELS[priceList.type]}
            {priceList.description ? ` · ${priceList.description}` : ''}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vigencia: {priceList.startsAt ? new Date(priceList.startsAt).toLocaleString('es-MX') : '—'}
            {' – '}
            {priceList.endsAt ? new Date(priceList.endsAt).toLocaleString('es-MX') : '—'}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={editing} onOpenChange={setEditing}>
            <DialogTrigger asChild>
              <Button variant="outline">Editar</Button>
            </DialogTrigger>
            {editing && (
              <EditPriceListDialog
                priceList={priceList}
                onSuccess={() => {
                  setEditing(false);
                  void reload();
                }}
              />
            )}
          </Dialog>
          <Button variant="outline" onClick={() => void handleToggleStatus()}>
            {priceList.status === 'active' ? 'Desactivar' : 'Activar'}
          </Button>
          <Button variant="outline" onClick={() => void handleDelete()}>
            Eliminar
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Precios de variante</h2>
        <PriceListOverridesTable
          priceList={priceList}
          variantLabels={variantLabels}
          onUpdated={(updated) => setPriceList(updated)}
        />
        <AddOverrideForm
          priceListId={priceList.id}
          onVariantSelected={(variantId, label) => setVariantLabels((prev) => ({ ...prev, [variantId]: label }))}
          onUpdated={(updated) => setPriceList(updated)}
        />
      </div>
    </div>
  );
}

function EditPriceListDialog({ priceList, onSuccess }: { priceList: PriceListOutput; onSuccess: () => void }) {
  const [title, setTitle] = useState(priceList.title);
  const [description, setDescription] = useState(priceList.description ?? '');
  const [type, setType] = useState<PriceListType>(priceList.type);
  const [startsAt, setStartsAt] = useState(toDateTimeInput(priceList.startsAt));
  const [endsAt, setEndsAt] = useState(toDateTimeInput(priceList.endsAt));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      await updatePriceList(priceList.id, {
        title,
        description: description || null,
        type,
        startsAt: fromDateTimeInput(startsAt),
        endsAt: fromDateTimeInput(endsAt),
      });
      toast.success('Lista de precios actualizada');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo actualizar la lista de precios');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar lista de precios</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-price-list-title">Título</Label>
          <Input id="edit-price-list-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-price-list-description">Descripción (opcional)</Label>
          <Input
            id="edit-price-list-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-price-list-starts-at">Inicia</Label>
            <Input
              id="edit-price-list-starts-at"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-price-list-ends-at">Termina</Label>
            <Input
              id="edit-price-list-ends-at"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </div>
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

function PriceListOverridesTable({
  priceList,
  variantLabels,
  onUpdated,
}: {
  priceList: PriceListOutput;
  variantLabels: Record<string, string>;
  onUpdated: (priceList: PriceListOutput) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState('');
  const [editingMinQuantity, setEditingMinQuantity] = useState('');
  const [editingMaxQuantity, setEditingMaxQuantity] = useState('');

  function startEdit(price: PriceListPriceOutput): void {
    setEditingId(price.id);
    setEditingAmount(price.amount.toString());
    setEditingMinQuantity(price.minQuantity?.toString() ?? '');
    setEditingMaxQuantity(price.maxQuantity?.toString() ?? '');
  }

  async function handleSaveEdit(): Promise<void> {
    if (!editingId) return;
    const amount = Number(editingAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('El precio no es válido');
      return;
    }
    const minQuantity = editingMinQuantity.trim() ? Number(editingMinQuantity) : null;
    const maxQuantity = editingMaxQuantity.trim() ? Number(editingMaxQuantity) : null;
    try {
      const updated = await updatePriceListPrice(priceList.id, editingId, { amount, minQuantity, maxQuantity });
      setEditingId(null);
      onUpdated(updated);
      toast.success('Precio actualizado');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo actualizar el precio');
    }
  }

  async function handleRemove(price: PriceListPriceOutput): Promise<void> {
    if (!window.confirm('¿Eliminar este precio?')) {
      return;
    }
    try {
      const updated = await removePriceListPrice(priceList.id, price.id);
      onUpdated(updated);
      toast.success('Precio eliminado');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar el precio');
    }
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Variante</TableHead>
            <TableHead>Moneda</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Cant. mín.</TableHead>
            <TableHead>Cant. máx.</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {priceList.prices.map((price) => (
            <TableRow key={price.id}>
              <TableCell className="font-medium">{variantLabels[price.variantId] ?? price.variantId}</TableCell>
              <TableCell>{price.currencyCode}</TableCell>
              <TableCell>
                {editingId === price.id ? (
                  <Input
                    type="number"
                    value={editingAmount}
                    onChange={(event) => setEditingAmount(event.target.value)}
                    className="w-24"
                  />
                ) : (
                  price.amount
                )}
              </TableCell>
              <TableCell>
                {editingId === price.id ? (
                  <Input
                    type="number"
                    value={editingMinQuantity}
                    onChange={(event) => setEditingMinQuantity(event.target.value)}
                    className="w-20"
                    placeholder="Sin mínimo"
                  />
                ) : (
                  price.minQuantity ?? 'Sin mínimo'
                )}
              </TableCell>
              <TableCell>
                {editingId === price.id ? (
                  <Input
                    type="number"
                    value={editingMaxQuantity}
                    onChange={(event) => setEditingMaxQuantity(event.target.value)}
                    className="w-20"
                    placeholder="Sin límite"
                  />
                ) : (
                  price.maxQuantity ?? 'Sin límite'
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {editingId === price.id ? (
                    <>
                      <Button size="sm" onClick={() => void handleSaveEdit()}>
                        Guardar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => startEdit(price)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void handleRemove(price)}>
                        Eliminar
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {priceList.prices.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                Sin precios configurados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function AddOverrideForm({
  priceListId,
  onVariantSelected,
  onUpdated,
}: {
  priceListId: string;
  onVariantSelected: (variantId: string, label: string) => void;
  onUpdated: (priceList: PriceListOutput) => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ListProductsOutputItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [variantOptions, setVariantOptions] = useState<{ id: string; label: string }[]>([]);
  const [variantId, setVariantId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('MXN');
  const [amount, setAmount] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [maxQuantity, setMaxQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSearch(): Promise<void> {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await listProducts({ search, pageSize: 10 });
      setResults(data.items);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo buscar productos');
    } finally {
      setSearching(false);
    }
  }

  async function handleSelectProduct(productId: string): Promise<void> {
    try {
      const product = await getProduct(productId);
      const options = product.variants.map((variant) => ({
        id: variant.id,
        label: `${product.title} · ${variant.title} (${variant.sku})`,
      }));
      setVariantOptions(options);
      for (const option of options) {
        onVariantSelected(option.id, option.label);
      }
      if (options[0]) {
        setVariantId(options[0].id);
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo cargar el producto');
    }
  }

  async function handleAdd(): Promise<void> {
    if (!variantId) {
      toast.error('Selecciona una variante');
      return;
    }
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue < 0) {
      toast.error('El precio no es válido');
      return;
    }
    if (!currencyCode.trim()) {
      toast.error('La moneda es obligatoria');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await addPriceListPrice(priceListId, {
        variantId,
        currencyCode: currencyCode.trim(),
        amount: amountValue,
        minQuantity: minQuantity.trim() ? Number(minQuantity) : null,
        maxQuantity: maxQuantity.trim() ? Number(maxQuantity) : null,
      });
      onUpdated(updated);
      setAmount('');
      setMinQuantity('');
      setMaxQuantity('');
      toast.success('Precio agregado');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo agregar el precio');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <h3 className="text-xs font-medium text-muted-foreground">Agregar precio de variante</h3>
      <div className="flex gap-2">
        <Input
          placeholder="Buscar producto por título, slug o SKU…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button variant="outline" onClick={() => void handleSearch()} disabled={searching}>
          {searching ? 'Buscando…' : 'Buscar'}
        </Button>
      </div>
      {results.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {results.map((product) => (
            <Button key={product.id} size="sm" variant="outline" onClick={() => void handleSelectProduct(product.id)}>
              {product.title}
            </Button>
          ))}
        </div>
      )}
      {variantOptions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Variante</Label>
          <Select value={variantId} onValueChange={setVariantId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {variantOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="override-currency">Moneda</Label>
          <Input
            id="override-currency"
            value={currencyCode}
            onChange={(event) => setCurrencyCode(event.target.value.toUpperCase())}
            maxLength={3}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="override-amount">Precio</Label>
          <Input id="override-amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="override-min">Cant. mín. (opcional)</Label>
          <Input id="override-min" type="number" value={minQuantity} onChange={(event) => setMinQuantity(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="override-max">Cant. máx. (opcional)</Label>
          <Input id="override-max" type="number" value={maxQuantity} onChange={(event) => setMaxQuantity(event.target.value)} />
        </div>
        <Button onClick={() => void handleAdd()} disabled={submitting}>
          {submitting ? 'Agregando…' : 'Agregar'}
        </Button>
      </div>
    </div>
  );
}

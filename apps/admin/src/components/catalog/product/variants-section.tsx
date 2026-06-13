'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import {
  addProductVariant,
  getVariantMatrix,
  removeProductVariant,
  updateProductVariant,
  type AddVariantInput,
  type UpdateVariantInput,
} from '@/lib/api/catalog';
import type { ProductOutput, ProductVariantOutput, VariantCombinationPreview } from '@/lib/api/types';
import { VariantInventorySection } from './variant-inventory-section';
import { VariantPricesSection } from './variant-prices-section';

const NONE_VALUE = '__none__';

interface VariantsSectionProps {
  product: ProductOutput;
  onUpdated: (product: ProductOutput) => void;
}

function combinationLabel(product: ProductOutput, optionValueIds: string[]): string {
  if (optionValueIds.length === 0) {
    return '—';
  }
  const labels = optionValueIds.map((valueId) => {
    for (const option of product.options) {
      const value = option.values.find((candidate) => candidate.id === valueId);
      if (value) {
        return value.value;
      }
    }
    return '?';
  });
  return labels.join(' / ');
}

export function VariantsSection({ product, onUpdated }: VariantsSectionProps) {
  const [matrix, setMatrix] = useState<VariantCombinationPreview[]>([]);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [presetOptionValueIds, setPresetOptionValueIds] = useState<string[] | null>(null);
  const editingVariant = editing && editing !== 'new' ? product.variants.find((candidate) => candidate.id === editing) ?? null : null;

  useEffect(() => {
    if (product.options.length === 0) {
      setMatrix([]);
      return;
    }
    void getVariantMatrix(product.id)
      .then(setMatrix)
      .catch(() => setMatrix([]));
  }, [product.id, product.options, product.variants]);

  async function handleRemove(variant: ProductVariantOutput): Promise<void> {
    if (!window.confirm(`¿Eliminar la variante "${variant.title}"?`)) {
      return;
    }
    try {
      const updated = await removeProductVariant(product.id, variant.id);
      toast.success('Variante eliminada');
      onUpdated(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar la variante');
    }
  }

  const missingCombinations = matrix.filter((combination) => !combination.exists);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      {missingCombinations.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-4">
          <h3 className="text-sm font-semibold">Combinaciones sin variante</h3>
          <div className="flex flex-wrap gap-2">
            {missingCombinations.map((combination) => (
              <Button
                key={combination.optionValueIds.join('|')}
                size="sm"
                variant="outline"
                onClick={() => {
                  setPresetOptionValueIds(combination.optionValueIds);
                  setEditing('new');
                }}
              >
                Crear &quot;{combination.label}&quot;
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variante</TableHead>
              <TableHead>SKU</TableHead>
              {product.options.length > 0 && <TableHead>Combinación</TableHead>}
              <TableHead>Costo</TableHead>
              <TableHead>Precio de oferta</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {product.variants.map((variant) => (
              <TableRow key={variant.id}>
                <TableCell className="font-medium">{variant.title}</TableCell>
                <TableCell className="text-muted-foreground">{variant.sku}</TableCell>
                {product.options.length > 0 && (
                  <TableCell className="text-muted-foreground">{combinationLabel(product, variant.optionValueIds)}</TableCell>
                )}
                <TableCell className="text-muted-foreground">{variant.cost ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{variant.salePrice ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Dialog
                      open={editing === variant.id}
                      onOpenChange={(open) => {
                        setEditing(open ? variant.id : null);
                        if (!open) setPresetOptionValueIds(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          Editar
                        </Button>
                      </DialogTrigger>
                      {editing === variant.id && editingVariant && (
                        <VariantDialog
                          product={product}
                          variant={editingVariant}
                          presetOptionValueIds={null}
                          onSuccess={(updated) => {
                            setEditing(null);
                            onUpdated(updated);
                          }}
                          onPricesUpdated={onUpdated}
                        />
                      )}
                    </Dialog>
                    <Button size="sm" variant="outline" onClick={() => void handleRemove(variant)}>
                      Eliminar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <Dialog
          open={editing === 'new'}
          onOpenChange={(open) => {
            setEditing(open ? 'new' : null);
            if (!open) setPresetOptionValueIds(null);
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => setPresetOptionValueIds(null)}>
              Agregar variante
            </Button>
          </DialogTrigger>
          {editing === 'new' && (
            <VariantDialog
              product={product}
              variant={null}
              presetOptionValueIds={presetOptionValueIds}
              onSuccess={(updated) => {
                setEditing(null);
                setPresetOptionValueIds(null);
                onUpdated(updated);
              }}
            />
          )}
        </Dialog>
      </div>
    </div>
  );
}

function VariantDialog({
  product,
  variant,
  presetOptionValueIds,
  onSuccess,
  onPricesUpdated,
}: {
  product: ProductOutput;
  variant: ProductVariantOutput | null;
  presetOptionValueIds: string[] | null;
  onSuccess: (product: ProductOutput) => void;
  onPricesUpdated?: (product: ProductOutput) => void;
}) {
  const initialOptionValueIds = presetOptionValueIds ?? variant?.optionValueIds ?? [];

  const [title, setTitle] = useState(variant?.title ?? '');
  const [sku, setSku] = useState(variant?.sku ?? '');
  const [barcode, setBarcode] = useState(variant?.barcode ?? '');
  const [cost, setCost] = useState(variant?.cost?.toString() ?? '');
  const [salePrice, setSalePrice] = useState(variant?.salePrice?.toString() ?? '');
  const [allowBackorder, setAllowBackorder] = useState(variant?.allowBackorder ?? false);
  const [manageInventory, setManageInventory] = useState(variant?.manageInventory ?? true);
  const [optionValues, setOptionValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const option of product.options) {
      const selected = option.values.find((value) => initialOptionValueIds.includes(value.id));
      map[option.id] = selected?.id ?? NONE_VALUE;
    }
    return map;
  });
  const [submitting, setSubmitting] = useState(false);

  function toNumberOrUndefined(value: string): number | undefined {
    if (!value.trim()) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  async function handleSubmit(): Promise<void> {
    const optionValueIds = Object.values(optionValues).filter((value) => value !== NONE_VALUE);
    const shared = {
      barcode: barcode || null,
      cost: toNumberOrUndefined(cost) ?? null,
      salePrice: toNumberOrUndefined(salePrice) ?? null,
      allowBackorder,
      manageInventory,
    };

    setSubmitting(true);
    try {
      let updated: ProductOutput;
      if (variant) {
        const input: UpdateVariantInput = { ...shared, title: title || undefined, sku: sku || undefined, optionValueIds };
        updated = await updateProductVariant(product.id, variant.id, input);
      } else {
        if (!title.trim() || !sku.trim()) {
          toast.error('El título y el SKU son obligatorios');
          setSubmitting(false);
          return;
        }
        const input: AddVariantInput = { ...shared, title, sku, optionValueIds };
        updated = await addProductVariant(product.id, input);
      }
      toast.success('Variante guardada');
      onSuccess(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar la variante');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{variant ? `Editar ${variant.title}` : 'Nueva variante'}</DialogTitle>
      </DialogHeader>
      <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="variant-title">Título</Label>
          <Input id="variant-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="variant-sku">SKU</Label>
          <Input id="variant-sku" value={sku} onChange={(event) => setSku(event.target.value)} />
        </div>

        {product.options.map((option) => (
          <div key={option.id} className="flex flex-col gap-1.5">
            <Label>{option.title}</Label>
            <Select
              value={optionValues[option.id] ?? NONE_VALUE}
              onValueChange={(value) => setOptionValues((prev) => ({ ...prev, [option.id]: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Sin valor</SelectItem>
                {option.values.map((value) => (
                  <SelectItem key={value.id} value={value.id}>
                    {value.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="variant-barcode">Código de barras</Label>
          <Input id="variant-barcode" value={barcode} onChange={(event) => setBarcode(event.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="variant-cost">Costo</Label>
            <Input id="variant-cost" type="number" value={cost} onChange={(event) => setCost(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="variant-sale-price">Precio de oferta</Label>
            <Input
              id="variant-sale-price"
              type="number"
              value={salePrice}
              onChange={(event) => setSalePrice(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="variant-manage-inventory"
              checked={manageInventory}
              onCheckedChange={(value) => setManageInventory(value === true)}
            />
            <Label htmlFor="variant-manage-inventory">Gestionar inventario</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="variant-allow-backorder"
              checked={allowBackorder}
              onCheckedChange={(value) => setAllowBackorder(value === true)}
            />
            <Label htmlFor="variant-allow-backorder">Permitir backorder</Label>
          </div>
        </div>

        {variant && onPricesUpdated && (
          <VariantPricesSection productId={product.id} variant={variant} onUpdated={onPricesUpdated} />
        )}

        {variant && <VariantInventorySection variant={variant} />}
      </div>
      <DialogFooter>
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import {
  addVariantTierPrice,
  removeVariantTierPrice,
  setVariantBasePrice,
  updateVariantTierPrice,
} from '@/lib/api/catalog';
import type { ProductOutput, ProductVariantOutput, VariantPriceOutput } from '@/lib/api/types';

interface VariantPricesSectionProps {
  productId: string;
  variant: ProductVariantOutput;
  onUpdated: (product: ProductOutput) => void;
}

export function VariantPricesSection({ productId, variant, onUpdated }: VariantPricesSectionProps) {
  const basePrices = variant.prices.filter((price) => price.minQuantity === null);
  const tierPrices = variant.prices.filter((price) => price.minQuantity !== null);

  const [baseCurrency, setBaseCurrency] = useState('MXN');
  const [baseAmount, setBaseAmount] = useState('');
  const [savingBase, setSavingBase] = useState(false);

  const [tierCurrency, setTierCurrency] = useState('MXN');
  const [tierAmount, setTierAmount] = useState('');
  const [tierMinQuantity, setTierMinQuantity] = useState('');
  const [tierMaxQuantity, setTierMaxQuantity] = useState('');
  const [savingTier, setSavingTier] = useState(false);

  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState('');
  const [editingMinQuantity, setEditingMinQuantity] = useState('');
  const [editingMaxQuantity, setEditingMaxQuantity] = useState('');

  async function handleSaveBasePrice(): Promise<void> {
    const currencyCode = baseCurrency.trim();
    const amount = Number(baseAmount);
    if (!currencyCode) {
      toast.error('La moneda es obligatoria');
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('El precio base no es válido');
      return;
    }
    setSavingBase(true);
    try {
      const updated = await setVariantBasePrice(productId, variant.id, { currencyCode, amount });
      setBaseAmount('');
      onUpdated(updated);
      toast.success('Precio base guardado');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar el precio base');
    } finally {
      setSavingBase(false);
    }
  }

  async function handleAddTierPrice(): Promise<void> {
    const currencyCode = tierCurrency.trim();
    const amount = Number(tierAmount);
    const minQuantity = Number(tierMinQuantity);
    const maxQuantity = tierMaxQuantity.trim() ? Number(tierMaxQuantity) : null;
    if (!currencyCode) {
      toast.error('La moneda es obligatoria');
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('El precio no es válido');
      return;
    }
    if (!Number.isInteger(minQuantity) || minQuantity < 1) {
      toast.error('La cantidad mínima debe ser un entero mayor o igual a 1');
      return;
    }
    setSavingTier(true);
    try {
      const updated = await addVariantTierPrice(productId, variant.id, {
        currencyCode,
        amount,
        minQuantity,
        maxQuantity,
      });
      setTierAmount('');
      setTierMinQuantity('');
      setTierMaxQuantity('');
      onUpdated(updated);
      toast.success('Tier price agregado');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo agregar el tier price');
    } finally {
      setSavingTier(false);
    }
  }

  function startEditTier(price: VariantPriceOutput): void {
    setEditingTierId(price.id);
    setEditingAmount(price.amount.toString());
    setEditingMinQuantity(price.minQuantity?.toString() ?? '');
    setEditingMaxQuantity(price.maxQuantity?.toString() ?? '');
  }

  async function handleSaveTierEdit(): Promise<void> {
    if (!editingTierId) {
      return;
    }
    const amount = Number(editingAmount);
    const minQuantity = Number(editingMinQuantity);
    const maxQuantity = editingMaxQuantity.trim() ? Number(editingMaxQuantity) : null;
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('El precio no es válido');
      return;
    }
    if (!Number.isInteger(minQuantity) || minQuantity < 1) {
      toast.error('La cantidad mínima debe ser un entero mayor o igual a 1');
      return;
    }
    try {
      const updated = await updateVariantTierPrice(productId, variant.id, editingTierId, {
        amount,
        minQuantity,
        maxQuantity,
      });
      setEditingTierId(null);
      onUpdated(updated);
      toast.success('Tier price actualizado');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo actualizar el tier price');
    }
  }

  async function handleRemoveTier(price: VariantPriceOutput): Promise<void> {
    if (!window.confirm('¿Eliminar este tier price?')) {
      return;
    }
    try {
      const updated = await removeVariantTierPrice(productId, variant.id, price.id);
      onUpdated(updated);
      toast.success('Tier price eliminado');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar el tier price');
    }
  }

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">Precios</h3>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-medium text-muted-foreground">Precio base por moneda</h4>
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Moneda</TableHead>
                <TableHead>Precio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {basePrices.map((price) => (
                <TableRow key={price.id}>
                  <TableCell className="font-medium">{price.currencyCode}</TableCell>
                  <TableCell>{price.amount}</TableCell>
                </TableRow>
              ))}
              {basePrices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                    Sin precio base configurado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="base-price-currency">Moneda</Label>
            <Input
              id="base-price-currency"
              value={baseCurrency}
              onChange={(event) => setBaseCurrency(event.target.value.toUpperCase())}
              maxLength={3}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="base-price-amount">Precio</Label>
            <Input id="base-price-amount" type="number" value={baseAmount} onChange={(event) => setBaseAmount(event.target.value)} />
          </div>
          <Button onClick={() => void handleSaveBasePrice()} disabled={savingBase}>
            {savingBase ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-medium text-muted-foreground">Tier prices (precio por cantidad)</h4>
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Moneda</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Cant. mín.</TableHead>
                <TableHead>Cant. máx.</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tierPrices.map((price) => (
                <TableRow key={price.id}>
                  <TableCell className="font-medium">{price.currencyCode}</TableCell>
                  <TableCell>
                    {editingTierId === price.id ? (
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
                    {editingTierId === price.id ? (
                      <Input
                        type="number"
                        value={editingMinQuantity}
                        onChange={(event) => setEditingMinQuantity(event.target.value)}
                        className="w-20"
                      />
                    ) : (
                      price.minQuantity
                    )}
                  </TableCell>
                  <TableCell>
                    {editingTierId === price.id ? (
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
                      {editingTierId === price.id ? (
                        <>
                          <Button size="sm" onClick={() => void handleSaveTierEdit()}>
                            Guardar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingTierId(null)}>
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEditTier(price)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void handleRemoveTier(price)}>
                            Eliminar
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tierPrices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Sin tier prices.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tier-price-currency">Moneda</Label>
            <Input
              id="tier-price-currency"
              value={tierCurrency}
              onChange={(event) => setTierCurrency(event.target.value.toUpperCase())}
              maxLength={3}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tier-price-amount">Precio</Label>
            <Input id="tier-price-amount" type="number" value={tierAmount} onChange={(event) => setTierAmount(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tier-price-min">Cant. mín.</Label>
            <Input
              id="tier-price-min"
              type="number"
              value={tierMinQuantity}
              onChange={(event) => setTierMinQuantity(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tier-price-max">Cant. máx. (opcional)</Label>
            <Input
              id="tier-price-max"
              type="number"
              value={tierMaxQuantity}
              onChange={(event) => setTierMaxQuantity(event.target.value)}
            />
          </div>
          <Button onClick={() => void handleAddTierPrice()} disabled={savingTier}>
            {savingTier ? 'Agregando…' : 'Agregar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

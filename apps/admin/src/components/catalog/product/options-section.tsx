'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';
import {
  addProductOption,
  addProductOptionValue,
  removeProductOption,
  removeProductOptionValue,
  updateProductOption,
} from '@/lib/api/catalog';
import type { ProductOptionOutput, ProductOutput } from '@/lib/api/types';

interface OptionsSectionProps {
  product: ProductOutput;
  onUpdated: (product: ProductOutput) => void;
}

export function OptionsSection({ product, onUpdated }: OptionsSectionProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newValues, setNewValues] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAddOption(): Promise<void> {
    if (!newTitle.trim()) {
      toast.error('El título de la opción es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      const values = newValues
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const updated = await addProductOption(product.id, { title: newTitle, values });
      toast.success('Opción agregada');
      setNewTitle('');
      setNewValues('');
      onUpdated(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo agregar la opción');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      {product.options.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Este producto no tiene opciones de variante (ej. Talla, Color). Sin opciones, solo puede tener una
          variante.
        </p>
      )}

      {product.options.map((option) => (
        <OptionRow key={option.id} productId={product.id} option={option} onUpdated={onUpdated} />
      ))}

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Agregar opción</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="option-title">Título (ej. Talla)</Label>
            <Input id="option-title" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="option-values">Valores iniciales (separados por coma)</Label>
            <Input
              id="option-values"
              placeholder="S, M, L"
              value={newValues}
              onChange={(event) => setNewValues(event.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void handleAddOption()} disabled={submitting}>
            {submitting ? 'Agregando…' : 'Agregar opción'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function OptionRow({
  productId,
  option,
  onUpdated,
}: {
  productId: string;
  option: ProductOptionOutput;
  onUpdated: (product: ProductOutput) => void;
}) {
  const [title, setTitle] = useState(option.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newValue, setNewValue] = useState('');

  async function handleSaveTitle(): Promise<void> {
    if (!title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    try {
      const updated = await updateProductOption(productId, option.id, title);
      setEditingTitle(false);
      onUpdated(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo actualizar la opción');
    }
  }

  async function handleRemoveOption(): Promise<void> {
    if (!window.confirm(`¿Eliminar la opción "${option.title}"? Se quitará de todas las variantes.`)) {
      return;
    }
    try {
      const updated = await removeProductOption(productId, option.id);
      toast.success('Opción eliminada');
      onUpdated(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar la opción');
    }
  }

  async function handleAddValue(): Promise<void> {
    if (!newValue.trim()) {
      return;
    }
    try {
      const updated = await addProductOptionValue(productId, option.id, newValue.trim());
      setNewValue('');
      onUpdated(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo agregar el valor');
    }
  }

  async function handleRemoveValue(valueId: string): Promise<void> {
    try {
      const updated = await removeProductOptionValue(productId, option.id, valueId);
      onUpdated(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar el valor');
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        {editingTitle ? (
          <div className="flex flex-1 gap-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSaveTitle();
                if (event.key === 'Escape') {
                  setTitle(option.title);
                  setEditingTitle(false);
                }
              }}
              autoFocus
            />
            <Button size="sm" onClick={() => void handleSaveTitle()}>
              Guardar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTitle(option.title);
                setEditingTitle(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <button type="button" className="text-left font-medium hover:underline" onClick={() => setEditingTitle(true)}>
            {option.title}
          </button>
        )}
        <Button size="sm" variant="outline" onClick={() => void handleRemoveOption()}>
          Eliminar opción
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {option.values.map((value) => (
          <Badge key={value.id} variant="outline" className="flex items-center gap-1">
            {value.value}
            <button type="button" onClick={() => void handleRemoveValue(value.id)} aria-label={`Eliminar ${value.value}`}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <div className="flex items-center gap-2">
          <Input
            className="h-7 w-32"
            placeholder="Nuevo valor"
            value={newValue}
            onChange={(event) => setNewValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleAddValue();
            }}
          />
          <Button size="sm" variant="outline" onClick={() => void handleAddValue()}>
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}

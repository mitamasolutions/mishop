'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import { addProductSpecification, removeProductSpecification, updateProductSpecification } from '@/lib/api/catalog';
import type { ProductOutput, ProductSpecificationOutput } from '@/lib/api/types';

interface SpecificationsSectionProps {
  product: ProductOutput;
  onUpdated: (product: ProductOutput) => void;
}

export function SpecificationsSection({ product, onUpdated }: SpecificationsSectionProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingValue, setEditingValue] = useState('');

  async function handleAdd(): Promise<void> {
    if (!name.trim() || !value.trim()) {
      toast.error('El nombre y el valor son obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await addProductSpecification(product.id, { name, value });
      setName('');
      setValue('');
      onUpdated(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo agregar la especificación');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(specification: ProductSpecificationOutput): void {
    setEditingId(specification.id);
    setEditingName(specification.name);
    setEditingValue(specification.value);
  }

  async function handleSaveEdit(): Promise<void> {
    if (!editingId) {
      return;
    }
    if (!editingName.trim() || !editingValue.trim()) {
      toast.error('El nombre y el valor son obligatorios');
      return;
    }
    try {
      const updated = await updateProductSpecification(product.id, editingId, {
        name: editingName,
        value: editingValue,
      });
      setEditingId(null);
      onUpdated(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo actualizar la especificación');
    }
  }

  async function handleRemove(specification: ProductSpecificationOutput): Promise<void> {
    if (!window.confirm(`¿Eliminar la especificación "${specification.name}"?`)) {
      return;
    }
    try {
      const updated = await removeProductSpecification(product.id, specification.id);
      onUpdated(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar la especificación');
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {product.specifications.map((specification) => (
              <TableRow key={specification.id}>
                <TableCell className="font-medium">
                  {editingId === specification.id ? (
                    <Input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                  ) : (
                    specification.name
                  )}
                </TableCell>
                <TableCell>
                  {editingId === specification.id ? (
                    <Input value={editingValue} onChange={(event) => setEditingValue(event.target.value)} />
                  ) : (
                    specification.value
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {editingId === specification.id ? (
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
                        <Button size="sm" variant="outline" onClick={() => startEdit(specification)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void handleRemove(specification)}>
                          Eliminar
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {product.specifications.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  No hay especificaciones.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Agregar especificación</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="spec-name">Nombre</Label>
            <Input id="spec-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="spec-value">Valor</Label>
            <Input id="spec-value" value={value} onChange={(event) => setValue(event.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void handleAdd()} disabled={submitting}>
            {submitting ? 'Agregando…' : 'Agregar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

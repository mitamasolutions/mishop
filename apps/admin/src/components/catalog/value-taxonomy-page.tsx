'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import type { ValueTaxonomyOutput } from '@/lib/api/types';

interface ValueTaxonomyPageProps {
  title: string;
  description: string;
  valueLabel: string;
  list: () => Promise<ValueTaxonomyOutput[]>;
  create: (value: string) => Promise<ValueTaxonomyOutput>;
  update: (id: string, value: string) => Promise<ValueTaxonomyOutput>;
  remove: (id: string) => Promise<void>;
}

export function ValueTaxonomyPage({ title, description, valueLabel, list, create, update, remove }: ValueTaxonomyPageProps) {
  const [items, setItems] = useState<ValueTaxonomyOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      setItems(await list());
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : `No se pudo cargar: ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleCreate(): Promise<void> {
    if (!newValue.trim()) {
      toast.error(`${valueLabel} es obligatorio`);
      return;
    }
    setSubmitting(true);
    try {
      await create(newValue.trim());
      setNewValue('');
      toast.success('Creado correctamente');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo crear');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(item: ValueTaxonomyOutput): void {
    setEditingId(item.id);
    setEditingValue(item.value);
  }

  async function handleUpdate(): Promise<void> {
    if (!editingId) {
      return;
    }
    if (!editingValue.trim()) {
      toast.error(`${valueLabel} es obligatorio`);
      return;
    }
    try {
      await update(editingId, editingValue.trim());
      setEditingId(null);
      toast.success('Actualizado correctamente');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo actualizar');
    }
  }

  async function handleDelete(item: ValueTaxonomyOutput): Promise<void> {
    if (!window.confirm(`¿Eliminar "${item.value}"?`)) {
      return;
    }
    try {
      await remove(item.id);
      toast.success('Eliminado correctamente');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar');
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="mt-6 flex gap-2">
        <Input
          placeholder={valueLabel}
          value={newValue}
          onChange={(event) => setNewValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleCreate();
          }}
        />
        <Button onClick={() => void handleCreate()} disabled={submitting}>
          Agregar
        </Button>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{valueLabel}</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {editingId === item.id ? (
                    <Input
                      value={editingValue}
                      onChange={(event) => setEditingValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void handleUpdate();
                        if (event.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    item.value
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {editingId === item.id ? (
                      <>
                        <Button size="sm" onClick={() => void handleUpdate()}>
                          Guardar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void handleDelete(item)}>
                          Eliminar
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                  No hay registros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

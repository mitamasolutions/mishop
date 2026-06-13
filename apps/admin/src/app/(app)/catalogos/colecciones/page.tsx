'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { createCollection, listCollections, updateCollection } from '@/lib/api/catalog';
import type { ProductCollectionOutput } from '@/lib/api/types';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<ProductCollectionOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductCollectionOutput | 'new' | null>(null);

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      setCollections(await listCollections());
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar las colecciones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Colecciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">Colecciones de productos del catálogo.</p>
        </div>
        <Dialog open={editing === 'new'} onOpenChange={(open) => setEditing(open ? 'new' : null)}>
          <DialogTrigger asChild>
            <Button>Nueva colección</Button>
          </DialogTrigger>
          {editing === 'new' && (
            <CollectionDialog
              collection={null}
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
              <TableHead>Título</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.map((collection) => (
              <TableRow key={collection.id}>
                <TableCell className="font-medium">{collection.title}</TableCell>
                <TableCell className="text-muted-foreground">{collection.handle}</TableCell>
                <TableCell className="text-right">
                  <Dialog open={editing === collection} onOpenChange={(open) => setEditing(open ? collection : null)}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        Editar
                      </Button>
                    </DialogTrigger>
                    {editing === collection && (
                      <CollectionDialog
                        collection={collection}
                        onSuccess={() => {
                          setEditing(null);
                          void reload();
                        }}
                      />
                    )}
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
            {!loading && collections.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  No hay colecciones.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CollectionDialog({
  collection,
  onSuccess,
}: {
  collection: ProductCollectionOutput | null;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(collection?.title ?? '');
  const [handle, setHandle] = useState(collection?.handle ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      if (collection) {
        await updateCollection(collection.id, { title, handle: handle || undefined });
      } else {
        await createCollection({ title, handle: handle || undefined });
      }
      toast.success('Colección guardada');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar la colección');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{collection ? `Editar ${collection.title}` : 'Nueva colección'}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="collection-title">Título</Label>
          <Input id="collection-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="collection-handle">Slug (opcional, se genera del título)</Label>
          <Input id="collection-handle" value={handle} onChange={(event) => setHandle(event.target.value)} />
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

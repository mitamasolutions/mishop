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
import { createBrand, listBrands, setBrandStatus, updateBrand } from '@/lib/api/catalog';
import type { BrandOutput } from '@/lib/api/types';

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BrandOutput | 'new' | null>(null);

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      setBrands(await listBrands());
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar las marcas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleToggleStatus(brand: BrandOutput): Promise<void> {
    try {
      await setBrandStatus(brand.id, !brand.isActive);
      toast.success(brand.isActive ? 'Marca desactivada' : 'Marca activada');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo cambiar el estado');
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marcas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Marcas / fabricantes del catálogo.</p>
        </div>
        <Dialog open={editing === 'new'} onOpenChange={(open) => setEditing(open ? 'new' : null)}>
          <DialogTrigger asChild>
            <Button>Nueva marca</Button>
          </DialogTrigger>
          {editing === 'new' && (
            <BrandDialog
              brand={null}
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
              <TableHead>Slug</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell className="font-medium">{brand.name}</TableCell>
                <TableCell className="text-muted-foreground">{brand.handle}</TableCell>
                <TableCell>
                  <Badge variant={brand.isActive ? 'default' : 'muted'}>
                    {brand.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Dialog open={editing === brand} onOpenChange={(open) => setEditing(open ? brand : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          Editar
                        </Button>
                      </DialogTrigger>
                      {editing === brand && (
                        <BrandDialog
                          brand={brand}
                          onSuccess={() => {
                            setEditing(null);
                            void reload();
                          }}
                        />
                      )}
                    </Dialog>
                    <Button size="sm" variant="outline" onClick={() => void handleToggleStatus(brand)}>
                      {brand.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && brands.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  No hay marcas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function BrandDialog({ brand, onSuccess }: { brand: BrandOutput | null; onSuccess: () => void }) {
  const [name, setName] = useState(brand?.name ?? '');
  const [handle, setHandle] = useState(brand?.handle ?? '');
  const [logoUrl, setLogoUrl] = useState(brand?.logoUrl ?? '');
  const [description, setDescription] = useState(brand?.description ?? '');
  const [metaTitle, setMetaTitle] = useState(brand?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(brand?.metaDescription ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      if (brand) {
        await updateBrand(brand.id, {
          name,
          handle: handle || undefined,
          logoUrl: logoUrl || null,
          description: description || null,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
        });
      } else {
        await createBrand({
          name,
          handle: handle || undefined,
          logoUrl: logoUrl || undefined,
          description: description || undefined,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
        });
      }
      toast.success('Marca guardada');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar la marca');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{brand ? `Editar ${brand.name}` : 'Nueva marca'}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brand-name">Nombre</Label>
          <Input id="brand-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brand-handle">Slug (opcional, se genera del nombre)</Label>
          <Input id="brand-handle" value={handle} onChange={(event) => setHandle(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brand-logo">URL del logo (opcional)</Label>
          <Input id="brand-logo" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brand-description">Descripción (opcional)</Label>
          <Input
            id="brand-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brand-meta-title">Meta title (SEO, opcional)</Label>
          <Input id="brand-meta-title" value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brand-meta-description">Meta description (SEO, opcional)</Label>
          <Input
            id="brand-meta-description"
            value={metaDescription}
            onChange={(event) => setMetaDescription(event.target.value)}
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

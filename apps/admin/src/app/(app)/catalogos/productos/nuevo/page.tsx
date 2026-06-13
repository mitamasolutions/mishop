'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';
import { createProduct } from '@/lib/api/catalog';

export default function NewProductPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [handle, setHandle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [defaultVariantSku, setDefaultVariantSku] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    if (!defaultVariantSku.trim()) {
      toast.error('El SKU de la variante por defecto es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      const product = await createProduct({
        title,
        handle: handle || undefined,
        subtitle: subtitle || undefined,
        defaultVariantSku,
      });
      toast.success('Producto creado');
      router.push(`/catalogos/productos/${product.id}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo crear el producto');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight">Nuevo producto</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Crea el producto con su variante por defecto. El resto de los detalles (opciones, variantes, taxonomías) se
        editan después.
      </p>

      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-title">Título</Label>
          <Input id="product-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-handle">Slug (opcional, se genera del título)</Label>
          <Input id="product-handle" value={handle} onChange={(event) => setHandle(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-subtitle">Subtítulo (opcional)</Label>
          <Textarea id="product-subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-sku">SKU de la variante por defecto</Label>
          <Input
            id="product-sku"
            value={defaultVariantSku}
            onChange={(event) => setDefaultVariantSku(event.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Creando…' : 'Crear producto'}
          </Button>
        </div>
      </div>
    </div>
  );
}

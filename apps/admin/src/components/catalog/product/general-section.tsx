'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';
import { listBrands, listProductTypes, setProductStatus, updateProduct } from '@/lib/api/catalog';
import type { BrandOutput, ProductOutput, ValueTaxonomyOutput } from '@/lib/api/types';
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABELS } from './constants';

const NONE_VALUE = '__none__';

interface GeneralSectionProps {
  product: ProductOutput;
  onUpdated: (product: ProductOutput) => void;
}

export function GeneralSection({ product, onUpdated }: GeneralSectionProps) {
  const [title, setTitle] = useState(product.title);
  const [handle, setHandle] = useState(product.handle);
  const [subtitle, setSubtitle] = useState(product.subtitle ?? '');
  const [description, setDescription] = useState(product.description ?? '');
  const [thumbnail, setThumbnail] = useState(product.thumbnail ?? '');
  const [isGiftcard, setIsGiftcard] = useState(product.isGiftcard);
  const [discountable, setDiscountable] = useState(product.discountable);
  const [weight, setWeight] = useState(product.weight?.toString() ?? '');
  const [length, setLength] = useState(product.length?.toString() ?? '');
  const [height, setHeight] = useState(product.height?.toString() ?? '');
  const [width, setWidth] = useState(product.width?.toString() ?? '');
  const [material, setMaterial] = useState(product.material ?? '');
  const [metaTitle, setMetaTitle] = useState(product.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(product.metaDescription ?? '');
  const [typeId, setTypeId] = useState(product.typeId ?? NONE_VALUE);
  const [brandId, setBrandId] = useState(product.brandId ?? NONE_VALUE);
  const [externalId, setExternalId] = useState(product.externalId ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [brands, setBrands] = useState<BrandOutput[]>([]);
  const [productTypes, setProductTypes] = useState<ValueTaxonomyOutput[]>([]);

  useEffect(() => {
    void listBrands().then(setBrands).catch(() => undefined);
    void listProductTypes().then(setProductTypes).catch(() => undefined);
  }, []);

  function toNumberOrNull(value: string): number | null {
    if (!value.trim()) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async function handleSubmit(): Promise<void> {
    if (!title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await updateProduct(product.id, {
        title,
        handle: handle || undefined,
        subtitle: subtitle || null,
        description: description || null,
        thumbnail: thumbnail || null,
        isGiftcard,
        discountable,
        weight: toNumberOrNull(weight),
        length: toNumberOrNull(length),
        height: toNumberOrNull(height),
        width: toNumberOrNull(width),
        material: material || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        typeId: typeId === NONE_VALUE ? null : typeId,
        brandId: brandId === NONE_VALUE ? null : brandId,
        externalId: externalId || null,
      });
      toast.success('Producto actualizado');
      onUpdated(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo actualizar el producto');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(status: string): Promise<void> {
    setStatusSubmitting(true);
    try {
      const updated = await setProductStatus(product.id, status as ProductOutput['status']);
      toast.success('Estado actualizado');
      onUpdated(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo actualizar el estado');
    } finally {
      setStatusSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="general-status">Estado</Label>
        <Select value={product.status} onValueChange={(value) => void handleStatusChange(value)} disabled={statusSubmitting}>
          <SelectTrigger id="general-status" className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {PRODUCT_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="general-title">Título</Label>
          <Input id="general-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="general-handle">Slug</Label>
          <Input id="general-handle" value={handle} onChange={(event) => setHandle(event.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="general-subtitle">Subtítulo</Label>
        <Input id="general-subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="general-description">Descripción</Label>
        <Textarea
          id="general-description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="general-thumbnail">URL de imagen principal</Label>
        <Input id="general-thumbnail" value={thumbnail} onChange={(event) => setThumbnail(event.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Marca</Label>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger>
              <SelectValue placeholder="Sin marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Sin marca</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Tipo de producto</Label>
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger>
              <SelectValue placeholder="Sin tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Sin tipo</SelectItem>
              {productTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Checkbox id="general-giftcard" checked={isGiftcard} onCheckedChange={(value) => setIsGiftcard(value === true)} />
          <Label htmlFor="general-giftcard">Es tarjeta de regalo</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="general-discountable"
            checked={discountable}
            onCheckedChange={(value) => setDiscountable(value === true)}
          />
          <Label htmlFor="general-discountable">Admite descuentos</Label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="general-weight">Peso</Label>
          <Input id="general-weight" type="number" value={weight} onChange={(event) => setWeight(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="general-length">Largo</Label>
          <Input id="general-length" type="number" value={length} onChange={(event) => setLength(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="general-height">Alto</Label>
          <Input id="general-height" type="number" value={height} onChange={(event) => setHeight(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="general-width">Ancho</Label>
          <Input id="general-width" type="number" value={width} onChange={(event) => setWidth(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="general-material">Material</Label>
          <Input id="general-material" value={material} onChange={(event) => setMaterial(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="general-external-id">ID externo</Label>
          <Input id="general-external-id" value={externalId} onChange={(event) => setExternalId(event.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="general-meta-title">Meta título (SEO)</Label>
        <Input id="general-meta-title" value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="general-meta-description">Meta descripción (SEO)</Label>
        <Textarea
          id="general-meta-description"
          value={metaDescription}
          onChange={(event) => setMetaDescription(event.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';
import { listCategories, listCollections, listProductTags, listSalesChannels, updateProduct } from '@/lib/api/catalog';
import type {
  ProductCategoryOutput,
  ProductCollectionOutput,
  ProductOutput,
  SalesChannelOutput,
  ValueTaxonomyOutput,
} from '@/lib/api/types';

interface TaxonomySectionProps {
  product: ProductOutput;
  onUpdated: (product: ProductOutput) => void;
}

function toggle(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((candidate) => candidate !== id) : [...ids, id];
}

export function TaxonomySection({ product, onUpdated }: TaxonomySectionProps) {
  const [categories, setCategories] = useState<ProductCategoryOutput[]>([]);
  const [collections, setCollections] = useState<ProductCollectionOutput[]>([]);
  const [tags, setTags] = useState<ValueTaxonomyOutput[]>([]);
  const [salesChannels, setSalesChannels] = useState<SalesChannelOutput[]>([]);

  const [categoryIds, setCategoryIds] = useState<string[]>(product.categoryIds);
  const [collectionIds, setCollectionIds] = useState<string[]>(product.collectionIds);
  const [tagIds, setTagIds] = useState<string[]>(product.tagIds);
  const [salesChannelIds, setSalesChannelIds] = useState<string[]>(product.salesChannelIds);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void listCategories().then(setCategories).catch(() => undefined);
    void listCollections().then(setCollections).catch(() => undefined);
    void listProductTags().then(setTags).catch(() => undefined);
    void listSalesChannels().then(setSalesChannels).catch(() => undefined);
  }, []);

  async function handleSubmit(): Promise<void> {
    setSubmitting(true);
    try {
      const updated = await updateProduct(product.id, { categoryIds, collectionIds, tagIds, salesChannelIds });
      toast.success('Taxonomías actualizadas');
      onUpdated(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudieron actualizar las taxonomías');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6">
      <TaxonomyGroup
        title="Categorías"
        items={categories.map((category) => ({ id: category.id, label: category.name }))}
        selected={categoryIds}
        onToggle={(id) => setCategoryIds((prev) => toggle(prev, id))}
      />
      <TaxonomyGroup
        title="Colecciones"
        items={collections.map((collection) => ({ id: collection.id, label: collection.title }))}
        selected={collectionIds}
        onToggle={(id) => setCollectionIds((prev) => toggle(prev, id))}
      />
      <TaxonomyGroup
        title="Etiquetas"
        items={tags.map((tag) => ({ id: tag.id, label: tag.value }))}
        selected={tagIds}
        onToggle={(id) => setTagIds((prev) => toggle(prev, id))}
      />
      <TaxonomyGroup
        title="Canales de venta"
        items={salesChannels.map((channel) => ({ id: channel.id, label: channel.name }))}
        selected={salesChannelIds}
        onToggle={(id) => setSalesChannelIds((prev) => toggle(prev, id))}
      />

      <div className="flex justify-end">
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}

function TaxonomyGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length === 0 && <p className="text-sm text-muted-foreground">No hay registros.</p>}
      <div className="flex flex-wrap gap-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Checkbox
              id={`${title}-${item.id}`}
              checked={selected.includes(item.id)}
              onCheckedChange={() => onToggle(item.id)}
            />
            <Label htmlFor={`${title}-${item.id}`} className="font-normal">
              {item.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

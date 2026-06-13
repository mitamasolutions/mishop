'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GeneralSection } from '@/components/catalog/product/general-section';
import { OptionsSection } from '@/components/catalog/product/options-section';
import { SpecificationsSection } from '@/components/catalog/product/specifications-section';
import { TaxonomySection } from '@/components/catalog/product/taxonomy-section';
import { VariantsSection } from '@/components/catalog/product/variants-section';
import { PRODUCT_STATUS_BADGE_VARIANT, PRODUCT_STATUS_LABELS } from '@/components/catalog/product/constants';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api-client';
import { deleteProduct, getProduct } from '@/lib/api/catalog';
import type { ProductOutput } from '@/lib/api/types';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'taxonomies', label: 'Taxonomías' },
  { id: 'options', label: 'Opciones' },
  { id: 'variants', label: 'Variantes' },
  { id: 'specifications', label: 'Especificaciones' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = params.id;

  const [product, setProduct] = useState<ProductOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('general');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProduct(productId)
      .then((result) => {
        if (!cancelled) setProduct(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(error instanceof ApiError ? error.message : 'No se pudo cargar el producto');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function handleDelete(): Promise<void> {
    if (!product) return;
    if (!window.confirm(`¿Eliminar el producto "${product.title}"?`)) {
      return;
    }
    try {
      await deleteProduct(product.id);
      toast.success('Producto eliminado');
      router.push('/catalogos/productos');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar el producto');
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl text-sm text-muted-foreground">Cargando…</div>;
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-muted-foreground">El producto no existe.</p>
        <Link href="/catalogos/productos" className="mt-4 inline-block text-sm underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/catalogos/productos" className="text-sm text-muted-foreground hover:underline">
            ← Productos
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{product.title}</h1>
            <Badge variant={PRODUCT_STATUS_BADGE_VARIANT[product.status]}>{PRODUCT_STATUS_LABELS[product.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">/{product.handle}</p>
        </div>
        <Button variant="outline" onClick={() => void handleDelete()}>
          Eliminar producto
        </Button>
      </div>

      <div className="mt-6 flex gap-1 border-b border-border">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'border-b-2 px-3 py-2 text-sm transition-colors',
              tab === item.id
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'general' && <GeneralSection product={product} onUpdated={setProduct} />}
        {tab === 'taxonomies' && <TaxonomySection product={product} onUpdated={setProduct} />}
        {tab === 'options' && <OptionsSection product={product} onUpdated={setProduct} />}
        {tab === 'variants' && <VariantsSection product={product} onUpdated={setProduct} />}
        {tab === 'specifications' && <SpecificationsSection product={product} onUpdated={setProduct} />}
      </div>
    </div>
  );
}

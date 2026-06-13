'use client';

import { ValueTaxonomyPage } from '@/components/catalog/value-taxonomy-page';
import { createProductTag, deleteProductTag, listProductTags, updateProductTag } from '@/lib/api/catalog';

export default function ProductTagsPage() {
  return (
    <ValueTaxonomyPage
      title="Etiquetas"
      description="Etiquetas utilizadas para clasificar productos del catálogo."
      valueLabel="Etiqueta"
      list={listProductTags}
      create={createProductTag}
      update={updateProductTag}
      remove={deleteProductTag}
    />
  );
}

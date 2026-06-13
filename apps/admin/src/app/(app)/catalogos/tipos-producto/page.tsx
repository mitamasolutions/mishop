'use client';

import { ValueTaxonomyPage } from '@/components/catalog/value-taxonomy-page';
import { createProductType, deleteProductType, listProductTypes, updateProductType } from '@/lib/api/catalog';

export default function ProductTypesPage() {
  return (
    <ValueTaxonomyPage
      title="Tipos de producto"
      description="Tipos utilizados para clasificar productos del catálogo."
      valueLabel="Tipo"
      list={listProductTypes}
      create={createProductType}
      update={updateProductType}
      remove={deleteProductType}
    />
  );
}

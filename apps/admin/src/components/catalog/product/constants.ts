import type { ProductStatus } from '@/lib/api/types';

export const PRODUCT_STATUSES: ProductStatus[] = ['draft', 'proposed', 'published', 'rejected'];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: 'Borrador',
  proposed: 'Propuesto',
  published: 'Publicado',
  rejected: 'Rechazado',
};

export const PRODUCT_STATUS_BADGE_VARIANT: Record<ProductStatus, 'default' | 'muted' | 'outline'> = {
  draft: 'muted',
  proposed: 'outline',
  published: 'default',
  rejected: 'muted',
};

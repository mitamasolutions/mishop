export interface ListProductsInput {
  search?: string;
  status?: string;
  categoryId?: string;
  collectionId?: string;
  salesChannelId?: string;
  page?: number;
  pageSize?: number;
}

export interface ListProductsOutputItem {
  id: string;
  title: string;
  handle: string;
  status: string;
  thumbnail: string | null;
  brandId: string | null;
  typeId: string | null;
  variantCount: number;
  defaultSku: string | null;
  updatedAt: string;
}

export interface ListProductsOutput {
  items: ListProductsOutputItem[];
  total: number;
  page: number;
  pageSize: number;
}

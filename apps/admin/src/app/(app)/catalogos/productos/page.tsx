'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PRODUCT_STATUS_BADGE_VARIANT, PRODUCT_STATUS_LABELS } from '@/components/catalog/product/constants';
import { ApiError } from '@/lib/api-client';
import { listProducts } from '@/lib/api/catalog';
import type { ListProductsOutput, ProductStatus } from '@/lib/api/types';

const STATUS_FILTER_ALL = '__all__';

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(STATUS_FILTER_ALL);
  const [data, setData] = useState<ListProductsOutput>({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listProducts({
      search: search || undefined,
      status: status === STATUS_FILTER_ALL ? undefined : (status as ProductStatus),
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar los productos');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [search, status, page]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Catálogo de productos, variantes y precios.</p>
        </div>
        <Link href="/catalogos/productos/nuevo" className={buttonVariants()}>
          Nuevo producto
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Buscar por título, slug o SKU…"
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setPage(1);
            setStatus(value);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_FILTER_ALL}>Todos los estados</SelectItem>
            {Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Variantes</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Actualizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((product) => (
              <TableRow key={product.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/catalogos/productos/${product.id}`} className="hover:underline">
                    {product.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">/{product.handle}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{product.defaultSku ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{product.variantCount}</TableCell>
                <TableCell>
                  <Badge variant={PRODUCT_STATUS_BADGE_VARIANT[product.status]}>{PRODUCT_STATUS_LABELS[product.status]}</Badge>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {new Date(product.updatedAt).toLocaleDateString('es-MX')}
                </TableCell>
              </TableRow>
            ))}
            {!loading && data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No hay productos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {data.page} de {totalPages} ({data.total} productos)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

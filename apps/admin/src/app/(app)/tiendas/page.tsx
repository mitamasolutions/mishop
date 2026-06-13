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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import { createStore, listStores, setStoreStatus, updateStore } from '@/lib/api/stores';
import { listCurrencies, listRegions } from '@/lib/api/reference-data';
import type { CurrencyOutput, RegionOutput, StoreOutput } from '@/lib/api/types';

export default function StoresPage() {
  const [stores, setStores] = useState<StoreOutput[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOutput[]>([]);
  const [regions, setRegions] = useState<RegionOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<StoreOutput | 'new' | null>(null);

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      const [storesData, currenciesData, regionsData] = await Promise.all([
        listStores(),
        listCurrencies(),
        listRegions(),
      ]);
      setStores(storesData);
      setCurrencies(currenciesData);
      setRegions(regionsData);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar las tiendas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleToggleStatus(store: StoreOutput): Promise<void> {
    try {
      await setStoreStatus(store.id, !store.isActive);
      toast.success(store.isActive ? 'Tienda desactivada' : 'Tienda activada');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo cambiar el estado');
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tiendas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tiendas registradas en la plataforma.</p>
        </div>
        <Dialog open={editing === 'new'} onOpenChange={(open) => setEditing(open ? 'new' : null)}>
          <DialogTrigger asChild>
            <Button>Nueva tienda</Button>
          </DialogTrigger>
          {editing === 'new' && (
            <StoreDialog
              store={null}
              currencies={currencies}
              regions={regions}
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
              <TableHead>Código</TableHead>
              <TableHead>Moneda</TableHead>
              <TableHead>Región</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores.map((store) => (
              <TableRow key={store.id}>
                <TableCell className="font-medium">{store.name}</TableCell>
                <TableCell>{store.code}</TableCell>
                <TableCell>{store.currencyCode}</TableCell>
                <TableCell>{store.regionId}</TableCell>
                <TableCell>
                  <Badge variant={store.isActive ? 'default' : 'muted'}>{store.isActive ? 'Activa' : 'Inactiva'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Dialog open={editing === store} onOpenChange={(open) => setEditing(open ? store : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          Editar
                        </Button>
                      </DialogTrigger>
                      {editing === store && (
                        <StoreDialog
                          store={store}
                          currencies={currencies}
                          regions={regions}
                          onSuccess={() => {
                            setEditing(null);
                            void reload();
                          }}
                        />
                      )}
                    </Dialog>
                    <Button size="sm" variant="outline" onClick={() => void handleToggleStatus(store)}>
                      {store.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && stores.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No hay tiendas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StoreDialog({
  store,
  currencies,
  regions,
  onSuccess,
}: {
  store: StoreOutput | null;
  currencies: CurrencyOutput[];
  regions: RegionOutput[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState(store?.name ?? '');
  const [code, setCode] = useState(store?.code ?? '');
  const [url, setUrl] = useState(store?.url ?? '');
  const [currencyCode, setCurrencyCode] = useState(store?.currencyCode ?? '');
  const [regionId, setRegionId] = useState(store?.regionId ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!name.trim() || !currencyCode || !regionId || (!store && !code.trim())) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      if (store) {
        await updateStore(store.id, { name, url: url || null, currencyCode, regionId });
      } else {
        await createStore({ name, code, url: url || undefined, currencyCode, regionId });
      }
      toast.success('Tienda guardada');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar la tienda');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{store ? `Editar ${store.name}` : 'Nueva tienda'}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="store-name">Nombre</Label>
          <Input id="store-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        {!store && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-code">Código</Label>
            <Input id="store-code" value={code} onChange={(event) => setCode(event.target.value)} />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="store-url">URL (opcional)</Label>
          <Input id="store-url" value={url} onChange={(event) => setUrl(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Moneda</Label>
          <Select value={currencyCode} onValueChange={setCurrencyCode}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una moneda" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} — {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Región</Label>
          <Select value={regionId} onValueChange={setRegionId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una región" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((region) => (
                <SelectItem key={region.id} value={region.id}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

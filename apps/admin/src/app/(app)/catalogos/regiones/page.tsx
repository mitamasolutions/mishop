'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Globe } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { hasPermission, useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';
import {
  createRegion,
  deactivateRegion,
  getRegion,
  listCountries,
  listCurrencies,
  listPaymentProviders,
  listRegions,
  updateRegion,
} from '@/lib/api/reference-data';
import type {
  CountryOutput,
  CurrencyOutput,
  PaymentProviderOutput,
  RegionDetailOutput,
  RegionOutput,
} from '@/lib/api/types';

export default function RegionesPage() {
  const user = useAuthStore((state) => state.user);
  const [regions, setRegions] = useState<RegionOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RegionOutput | 'new' | null>(null);

  // Reference data for dialogs
  const [currencies, setCurrencies] = useState<CurrencyOutput[]>([]);
  const [countries, setCountries] = useState<CountryOutput[]>([]);
  const [paymentProviders, setPaymentProviders] = useState<PaymentProviderOutput[]>([]);

  const canCreate = hasPermission(user, 'regions.create');
  const canUpdate = hasPermission(user, 'regions.update');
  const canDelete = hasPermission(user, 'regions.delete');

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      const [regs, curs, ctrs, pps] = await Promise.all([
        listRegions(),
        listCurrencies(),
        listCountries(),
        listPaymentProviders(),
      ]);
      setRegions(regs);
      setCurrencies(curs);
      setCountries(ctrs);
      setPaymentProviders(pps);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar las regiones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleDeactivate(region: RegionOutput): Promise<void> {
    try {
      await deactivateRegion(region.id);
      toast.success('Región desactivada');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo desactivar la región');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Regiones</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Unidades geográficas de primer nivel. Cada región define una moneda, países y proveedores de pago.
          </p>
        </div>
        {canCreate && (
          <Dialog open={editing === 'new'} onOpenChange={(open) => setEditing(open ? 'new' : null)}>
            <DialogTrigger asChild>
              <Button>Nueva región</Button>
            </DialogTrigger>
            {editing === 'new' && (
              <RegionDialog
                region={null}
                currencies={currencies}
                countries={countries}
                paymentProviders={paymentProviders}
                onSuccess={() => {
                  setEditing(null);
                  void reload();
                }}
              />
            )}
          </Dialog>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Moneda</TableHead>
              <TableHead>Países</TableHead>
              <TableHead>Pagos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regions.map((region) => (
              <TableRow key={region.id}>
                <TableCell className="font-medium">{region.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{region.currencyCode}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">—</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">—</span>
                </TableCell>
                <TableCell>
                  <Badge variant={region.isActive ? 'default' : 'muted'}>
                    {region.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {canUpdate && (
                      <Dialog
                        open={editing === region}
                        onOpenChange={(open) => setEditing(open ? region : null)}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            Editar
                          </Button>
                        </DialogTrigger>
                        {editing === region && (
                          <RegionDialog
                            region={region}
                            currencies={currencies}
                            countries={countries}
                            paymentProviders={paymentProviders}
                            onSuccess={() => {
                              setEditing(null);
                              void reload();
                            }}
                          />
                        )}
                      </Dialog>
                    )}
                    {canDelete && region.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDeactivate(region)}
                      >
                        Desactivar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && regions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No hay regiones.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Diálogo de región ─────────────────────────────────────────────────────────

interface RegionDialogProps {
  region: RegionOutput | null;
  currencies: CurrencyOutput[];
  countries: CountryOutput[];
  paymentProviders: PaymentProviderOutput[];
  onSuccess: () => void;
}

function RegionDialog({ region, currencies, countries, paymentProviders, onSuccess }: RegionDialogProps) {
  const [name, setName] = useState(region?.name ?? '');
  const [currencyCode, setCurrencyCode] = useState(region?.currencyCode ?? '');
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [loadingDetail, setLoadingDetail] = useState(!!region);
  const [submitting, setSubmitting] = useState(false);

  // Load existing associations when editing
  useEffect(() => {
    if (!region) return;
    setLoadingDetail(true);
    getRegion(region.id)
      .then((detail: RegionDetailOutput) => {
        setSelectedCountries(new Set(detail.countriesIso2));
        setSelectedProviders(new Set(detail.paymentProviderIds));
      })
      .catch(() => {
        toast.error('No se pudieron cargar los detalles de la región');
      })
      .finally(() => setLoadingDetail(false));
  }, [region]);

  function toggleCountry(iso2: string): void {
    setSelectedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(iso2)) next.delete(iso2);
      else next.add(iso2);
      return next;
    });
  }

  function toggleProvider(id: string): void {
    setSelectedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(): Promise<void> {
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!currencyCode) {
      toast.error('La moneda es obligatoria');
      return;
    }
    setSubmitting(true);
    try {
      if (region) {
        await updateRegion(region.id, {
          name: name.trim(),
          currencyCode,
          countriesIso2: Array.from(selectedCountries),
          paymentProviderIds: Array.from(selectedProviders),
        });
      } else {
        const { regionId } = await createRegion(name.trim(), currencyCode);
        // Associate countries and payment providers after creation
        if (selectedCountries.size > 0 || selectedProviders.size > 0) {
          await updateRegion(regionId, {
            countriesIso2: Array.from(selectedCountries),
            paymentProviderIds: Array.from(selectedProviders),
          });
        }
      }
      toast.success('Región guardada');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar la región');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{region ? `Editar ${region.name}` : 'Nueva región'}</DialogTitle>
      </DialogHeader>

      {loadingDetail ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Datos generales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="region-name">Nombre *</Label>
              <Input
                id="region-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="p. ej. México"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Moneda *</Label>
              <Select value={currencyCode} onValueChange={setCurrencyCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una moneda" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Países */}
          <div className="flex flex-col gap-1.5">
            <Label>Países ({selectedCountries.size} seleccionados)</Label>
            <div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-3">
              {countries.map((country) => (
                <label key={country.iso2} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedCountries.has(country.iso2)}
                    onCheckedChange={() => toggleCountry(country.iso2)}
                  />
                  <span className="truncate">{country.displayName}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Proveedores de pago */}
          <div className="flex flex-col gap-1.5">
            <Label>Proveedores de pago ({selectedProviders.size} seleccionados)</Label>
            <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
              {paymentProviders.map((provider) => (
                <label key={provider.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedProviders.has(provider.id)}
                    onCheckedChange={() => toggleProvider(provider.id)}
                  />
                  {provider.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button onClick={() => void handleSubmit()} disabled={submitting || loadingDetail}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

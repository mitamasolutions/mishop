'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { hasPermission, useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';
import {
  createTerritory,
  deactivateTerritory,
  listRegions,
  listTerritoriesByRegion,
  updateTerritory,
} from '@/lib/api/reference-data';
import type { RegionOutput, TerritoryOutput } from '@/lib/api/types';

interface TerritoryWithRegion extends TerritoryOutput {
  regionName: string;
}

export default function TerritoriosPage() {
  const user = useAuthStore((state) => state.user);
  const [regions, setRegions] = useState<RegionOutput[]>([]);
  const [territories, setTerritories] = useState<TerritoryWithRegion[]>([]);
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TerritoryOutput | 'new' | null>(null);

  const canCreate = hasPermission(user, 'territories.create');
  const canUpdate = hasPermission(user, 'territories.update');
  const canDelete = hasPermission(user, 'territories.delete');

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      const regs = await listRegions();
      setRegions(regs);

      const all = await Promise.all(
        regs.map((r) =>
          listTerritoriesByRegion(r.id).then((ts) =>
            ts.map((t) => ({ ...t, regionName: r.name })),
          ),
        ),
      );
      setTerritories(all.flat());
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar los territorios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleDeactivate(territory: TerritoryOutput): Promise<void> {
    try {
      await deactivateTerritory(territory.id);
      toast.success('Territorio desactivado');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo desactivar el territorio');
    }
  }

  const visible = filterRegion === 'all'
    ? territories
    : territories.filter((t) => t.regionId === filterRegion);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Territorios</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Segundo nivel jerárquico. Cada territorio pertenece a una región y concentra la
            configuración de envío.
          </p>
        </div>
        {canCreate && (
          <Dialog open={editing === 'new'} onOpenChange={(open) => setEditing(open ? 'new' : null)}>
            <DialogTrigger asChild>
              <Button>Nuevo territorio</Button>
            </DialogTrigger>
            {editing === 'new' && (
              <TerritoryDialog
                territory={null}
                regions={regions}
                onSuccess={() => {
                  setEditing(null);
                  void reload();
                }}
              />
            )}
          </Dialog>
        )}
      </div>

      {/* Filtro por región */}
      <div className="mt-4 flex items-center gap-3">
        <Label className="shrink-0 text-sm text-muted-foreground">Región:</Label>
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las regiones</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Región</TableHead>
              <TableHead>Envío</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((territory) => (
              <TableRow key={territory.id}>
                <TableCell className="font-medium">{territory.name}</TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{territory.code}</code>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{territory.regionName}</TableCell>
                <TableCell>
                  {territory.shippingCost !== null ? (
                    <span className="text-sm">${territory.shippingCost.toFixed(2)}</span>
                  ) : territory.freeShippingThreshold !== null ? (
                    <Badge variant="muted">Gratis &gt; ${territory.freeShippingThreshold}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={territory.isActive ? 'default' : 'muted'}>
                    {territory.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {canUpdate && (
                      <Dialog
                        open={editing === territory}
                        onOpenChange={(open) => setEditing(open ? territory : null)}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            Editar
                          </Button>
                        </DialogTrigger>
                        {editing === territory && (
                          <TerritoryDialog
                            territory={territory}
                            regions={regions}
                            onSuccess={() => {
                              setEditing(null);
                              void reload();
                            }}
                          />
                        )}
                      </Dialog>
                    )}
                    {canDelete && territory.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDeactivate(territory)}
                      >
                        Desactivar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No hay territorios.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Diálogo de territorio ─────────────────────────────────────────────────────

interface TerritoryDialogProps {
  territory: TerritoryOutput | null;
  regions: RegionOutput[];
  onSuccess: () => void;
}

function TerritoryDialog({ territory, regions, onSuccess }: TerritoryDialogProps) {
  const [regionId, setRegionId] = useState(territory?.regionId ?? '');
  const [name, setName] = useState(territory?.name ?? '');
  const [code, setCode] = useState(territory?.code ?? '');
  const [isActive, setIsActive] = useState(territory?.isActive ?? true);
  const [automaticFulfillment, setAutomaticFulfillment] = useState(territory?.automaticFulfillment ?? false);
  const [minSubtotal, setMinSubtotal] = useState<string>(territory?.minSubtotal?.toString() ?? '');
  const [minSubtotalWithTax, setMinSubtotalWithTax] = useState(territory?.minSubtotalWithTax ?? false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<string>(
    territory?.freeShippingThreshold?.toString() ?? '',
  );
  const [freeShippingThresholdWithTax, setFreeShippingThresholdWithTax] = useState(
    territory?.freeShippingThresholdWithTax ?? false,
  );
  const [freeShippingNoDiscount, setFreeShippingNoDiscount] = useState(territory?.freeShippingNoDiscount ?? false);
  const [shippingCost, setShippingCost] = useState<string>(territory?.shippingCost?.toString() ?? '');
  const [description, setDescription] = useState(territory?.description ?? '');
  const [submitting, setSubmitting] = useState(false);

  function parseOptionalNumber(value: string): number | null {
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
  }

  async function handleSubmit(): Promise<void> {
    if (!name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!code.trim()) { toast.error('El código es obligatorio'); return; }
    if (!territory && !regionId) { toast.error('Debes seleccionar una región'); return; }

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      automaticFulfillment,
      minSubtotal: parseOptionalNumber(minSubtotal),
      minSubtotalWithTax,
      freeShippingThreshold: parseOptionalNumber(freeShippingThreshold),
      freeShippingThresholdWithTax,
      freeShippingNoDiscount,
      shippingCost: parseOptionalNumber(shippingCost),
      description: description.trim() || null,
    };

    setSubmitting(true);
    try {
      if (territory) {
        await updateTerritory(territory.id, { ...payload, isActive });
      } else {
        await createTerritory(regionId, payload);
      }
      toast.success('Territorio guardado');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar el territorio');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedRegion = regions.find((r) => r.id === (territory?.regionId ?? regionId));

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{territory ? `Editar ${territory.name}` : 'Nuevo territorio'}</DialogTitle>
      </DialogHeader>

      <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
        {/* ── General ── */}
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            General
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {!territory && (
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Región *</Label>
                <Select value={regionId} onValueChange={setRegionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una región" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {territory && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">
                  Región: <span className="font-medium text-foreground">{selectedRegion?.name ?? territory.regionId}</span>
                </p>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="terr-name">Nombre *</Label>
              <Input id="terr-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="p. ej. Norte" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="terr-code">Código *</Label>
              <Input
                id="terr-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="p. ej. NORTE"
                className="font-mono"
              />
            </div>
            {territory && (
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox id="terr-active" checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
                <label htmlFor="terr-active" className="cursor-pointer text-sm">Activo</label>
              </div>
            )}
          </div>
        </section>

        {/* ── Envío ── */}
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Configuración de envío
            {selectedRegion && (
              <span className="ml-2 normal-case font-normal">
                (moneda: {selectedRegion.currencyCode})
              </span>
            )}
          </h3>
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={automaticFulfillment}
                onCheckedChange={(v) => setAutomaticFulfillment(!!v)}
              />
              Garantía automática al finalizar pedido
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="min-subtotal">Subtotal mínimo</Label>
                <Input
                  id="min-subtotal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={minSubtotal}
                  onChange={(e) => setMinSubtotal(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={minSubtotalWithTax}
                    onCheckedChange={(v) => setMinSubtotalWithTax(!!v)}
                  />
                  Incluir impuestos
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="free-threshold">Envío gratis a partir de</Label>
                <Input
                  id="free-threshold"
                  type="number"
                  min="0"
                  step="0.01"
                  value={freeShippingThreshold}
                  onChange={(e) => setFreeShippingThreshold(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="flex flex-col gap-2 pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={freeShippingThresholdWithTax}
                    onCheckedChange={(v) => setFreeShippingThresholdWithTax(!!v)}
                  />
                  Incluir impuestos
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={freeShippingNoDiscount}
                    onCheckedChange={(v) => setFreeShippingNoDiscount(!!v)}
                  />
                  Sin descuentos aplicados
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shipping-cost">Costo de envío</Label>
                <Input
                  id="shipping-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="terr-desc">Descripción</Label>
              <Input
                id="terr-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción opcional"
              />
            </div>
          </div>
        </section>
      </div>

      <DialogFooter>
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

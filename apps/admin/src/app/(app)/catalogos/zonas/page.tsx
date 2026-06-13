'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';
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
  createZone,
  deactivateZone,
  listRegions,
  listTerritoriesByRegion,
  listZonesByTerritory,
  updateZone,
} from '@/lib/api/reference-data';
import type { RegionOutput, TerritoryOutput, ZoneOutput } from '@/lib/api/types';

interface ZoneWithParents extends ZoneOutput {
  territoryName: string;
  regionName: string;
}

interface TerritoryWithRegion extends TerritoryOutput {
  regionName: string;
}

export default function ZonasPage() {
  const user = useAuthStore((state) => state.user);
  const [regions, setRegions] = useState<RegionOutput[]>([]);
  const [territories, setTerritories] = useState<TerritoryWithRegion[]>([]);
  const [zones, setZones] = useState<ZoneWithParents[]>([]);
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterTerritory, setFilterTerritory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ZoneOutput | 'new' | null>(null);

  const canCreate = hasPermission(user, 'zones.create');
  const canUpdate = hasPermission(user, 'zones.update');
  const canDelete = hasPermission(user, 'zones.delete');

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      const regs = await listRegions();
      setRegions(regs);

      const terrsByRegion = await Promise.all(
        regs.map((r) =>
          listTerritoriesByRegion(r.id).then((ts) =>
            ts.map((t) => ({ ...t, regionName: r.name })),
          ),
        ),
      );
      const allTerritories = terrsByRegion.flat();
      setTerritories(allTerritories);

      const zonesByTerritory = await Promise.all(
        allTerritories.map((t) =>
          listZonesByTerritory(t.id).then((zs) =>
            zs.map((z) => ({ ...z, territoryName: t.name, regionName: t.regionName })),
          ),
        ),
      );
      setZones(zonesByTerritory.flat());
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar las zonas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleDeactivate(zone: ZoneOutput): Promise<void> {
    try {
      await deactivateZone(zone.id);
      toast.success('Zona desactivada');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo desactivar la zona');
    }
  }

  // Derived data for filters
  const territoriesForFilter =
    filterRegion === 'all'
      ? territories
      : territories.filter((t) => t.regionId === filterRegion);

  const visibleZones = zones.filter((z) => {
    if (filterRegion !== 'all') {
      const t = territories.find((t) => t.id === z.territoryId);
      if (!t || t.regionId !== filterRegion) return false;
    }
    if (filterTerritory !== 'all' && z.territoryId !== filterTerritory) return false;
    return true;
  });

  // Reset territory filter when region changes
  function handleRegionChange(value: string): void {
    setFilterRegion(value);
    setFilterTerritory('all');
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Zonas</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Tercer nivel jerárquico. Cada zona pertenece a un territorio y es el agrupador geográfico más fino.
          </p>
        </div>
        {canCreate && (
          <Dialog open={editing === 'new'} onOpenChange={(open) => setEditing(open ? 'new' : null)}>
            <DialogTrigger asChild>
              <Button>Nueva zona</Button>
            </DialogTrigger>
            {editing === 'new' && (
              <ZoneDialog
                zone={null}
                territories={territories}
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

      {/* Filtros */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="shrink-0 text-sm text-muted-foreground">Región:</Label>
          <Select value={filterRegion} onValueChange={handleRegionChange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="shrink-0 text-sm text-muted-foreground">Territorio:</Label>
          <Select value={filterTerritory} onValueChange={setFilterTerritory}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {territoriesForFilter.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Territorio</TableHead>
              <TableHead>Región</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleZones.map((zone) => (
              <TableRow key={zone.id}>
                <TableCell className="font-medium">{zone.name}</TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{zone.code}</code>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{zone.territoryName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{zone.regionName}</TableCell>
                <TableCell>
                  <Badge variant={zone.isActive ? 'default' : 'muted'}>
                    {zone.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {canUpdate && (
                      <Dialog
                        open={editing === zone}
                        onOpenChange={(open) => setEditing(open ? zone : null)}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            Editar
                          </Button>
                        </DialogTrigger>
                        {editing === zone && (
                          <ZoneDialog
                            zone={zone}
                            territories={territories}
                            regions={regions}
                            onSuccess={() => {
                              setEditing(null);
                              void reload();
                            }}
                          />
                        )}
                      </Dialog>
                    )}
                    {canDelete && zone.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDeactivate(zone)}
                      >
                        Desactivar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && visibleZones.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No hay zonas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Diálogo de zona ───────────────────────────────────────────────────────────

interface ZoneDialogProps {
  zone: ZoneOutput | null;
  territories: TerritoryWithRegion[];
  regions: RegionOutput[];
  onSuccess: () => void;
}

function ZoneDialog({ zone, territories, regions, onSuccess }: ZoneDialogProps) {
  const [regionId, setRegionId] = useState<string>(() => {
    if (!zone) return '';
    const t = territories.find((t) => t.id === zone.territoryId);
    return t?.regionId ?? '';
  });
  const [territoryId, setTerritoryId] = useState(zone?.territoryId ?? '');
  const [name, setName] = useState(zone?.name ?? '');
  const [code, setCode] = useState(zone?.code ?? '');
  const [isActive, setIsActive] = useState(zone?.isActive ?? true);
  const [description, setDescription] = useState(zone?.description ?? '');
  const [submitting, setSubmitting] = useState(false);

  const territoriesForRegion =
    regionId ? territories.filter((t) => t.regionId === regionId) : territories;

  function handleRegionChange(value: string): void {
    setRegionId(value);
    setTerritoryId('');
  }

  async function handleSubmit(): Promise<void> {
    if (!name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!code.trim()) { toast.error('El código es obligatorio'); return; }
    if (!zone && !territoryId) { toast.error('Debes seleccionar un territorio'); return; }

    setSubmitting(true);
    try {
      if (zone) {
        await updateZone(zone.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          isActive,
          description: description.trim() || null,
        });
      } else {
        await createZone(territoryId, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || null,
        });
      }
      toast.success('Zona guardada');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar la zona');
    } finally {
      setSubmitting(false);
    }
  }

  const parentTerritory = territories.find((t) => t.id === (zone?.territoryId ?? territoryId));

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{zone ? `Editar ${zone.name}` : 'Nueva zona'}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        {!zone && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Región</Label>
              <Select value={regionId} onValueChange={handleRegionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una región (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Territorio *</Label>
              <Select value={territoryId} onValueChange={setTerritoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un territorio" />
                </SelectTrigger>
                <SelectContent>
                  {territoriesForRegion.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {!regionId && (
                        <span className="ml-1 text-xs text-muted-foreground">({t.regionName})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {zone && (
          <p className="text-sm text-muted-foreground">
            Territorio:{' '}
            <span className="font-medium text-foreground">
              {parentTerritory?.name ?? zone.territoryId}
            </span>
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zone-name">Nombre *</Label>
            <Input id="zone-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="p. ej. Norte" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zone-code">Código *</Label>
            <Input
              id="zone-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="p. ej. NORTE"
              className="font-mono"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="zone-desc">Descripción</Label>
          <Input
            id="zone-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción opcional"
          />
        </div>

        {zone && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox id="zone-active" checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
            <span>Activa</span>
          </label>
        )}
      </div>

      <DialogFooter>
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

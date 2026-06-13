'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PERMISSIONS, type Permission } from '@mitama/contracts/acl/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { hasPermission, useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';
import { createRole, deleteRole, listRoles, updateRole } from '@/lib/api/roles';
import type { RoleOutput } from '@/lib/api/types';

export default function RolesPage() {
  const user = useAuthStore((state) => state.user);
  const [roles, setRoles] = useState<RoleOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RoleOutput | 'new' | null>(null);

  const canCreate = hasPermission(user, 'roles.create');
  const canUpdate = hasPermission(user, 'roles.update');
  const canDelete = hasPermission(user, 'roles.delete');

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      setRoles(await listRoles());
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar los roles');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleDelete(role: RoleOutput): Promise<void> {
    try {
      await deleteRole(role.id);
      toast.success('Rol borrado');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo borrar el rol');
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">Roles del sistema y permisos por rol.</p>
        </div>
        {canCreate && (
          <Dialog open={editing === 'new'} onOpenChange={(open) => setEditing(open ? 'new' : null)}>
            <DialogTrigger asChild>
              <Button>Nuevo rol</Button>
            </DialogTrigger>
            {editing === 'new' && (
              <RoleDialog role={null} onSuccess={() => { setEditing(null); void reload(); }} />
            )}
          </Dialog>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Permisos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">
                  {role.name}
                  {role.isSystem && (
                    <Badge variant="muted" className="ml-2">
                      Sistema
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    {role.permissions.slice(0, 6).map((permission) => (
                      <Badge key={permission} variant="outline">
                        {permission}
                      </Badge>
                    ))}
                    {role.permissions.length > 6 && (
                      <Badge variant="outline">+{role.permissions.length - 6}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {canUpdate && !role.isSystem && (
                      <Dialog open={editing === role} onOpenChange={(open) => setEditing(open ? role : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            Editar
                          </Button>
                        </DialogTrigger>
                        {editing === role && (
                          <RoleDialog role={role} onSuccess={() => { setEditing(null); void reload(); }} />
                        )}
                      </Dialog>
                    )}
                    {canDelete && !role.isSystem && (
                      <Button size="sm" variant="outline" onClick={() => void handleDelete(role)}>
                        Borrar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && roles.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  No hay roles.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RoleDialog({ role, onSuccess }: { role: RoleOutput | null; onSuccess: () => void }) {
  const [name, setName] = useState(role?.name ?? '');
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set((role?.permissions ?? []) as Permission[]));
  const [submitting, setSubmitting] = useState(false);

  function togglePermission(permission: Permission): void {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
  }

  async function handleSubmit(): Promise<void> {
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      if (role) {
        await updateRole(role.id, { name, permissions: Array.from(permissions) });
      } else {
        await createRole(name, Array.from(permissions));
      }
      toast.success('Rol guardado');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar el rol');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{role ? `Editar ${role.name}` : 'Nuevo rol'}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role-name">Nombre</Label>
          <Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Permisos</Label>
          <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-2">
            {PERMISSIONS.map((permission) => (
              <label key={permission} className="flex items-center gap-2 text-sm">
                <Checkbox checked={permissions.has(permission)} onCheckedChange={() => togglePermission(permission)} />
                {permission}
              </label>
            ))}
          </div>
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

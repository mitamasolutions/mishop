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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { hasPermission, useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@/lib/api-client';
import { assignUserStoreRole, inviteUser, listUsers, removeUserStoreRole, setUserStatus } from '@/lib/api/users';
import { listRoles } from '@/lib/api/roles';
import { listStores } from '@/lib/api/stores';
import type { RoleOutput, StoreOutput, UserOutput, UserStatus } from '@/lib/api/types';

const STATUS_LABELS: Record<UserStatus, string> = {
  invited: 'Invitado',
  active: 'Activo',
  locked: 'Bloqueado',
  disabled: 'Deshabilitado',
};

const STATUS_OPTIONS: UserStatus[] = ['active', 'locked', 'disabled'];

export default function UsersPage() {
  const user = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<UserOutput[]>([]);
  const [roles, setRoles] = useState<RoleOutput[]>([]);
  const [stores, setStores] = useState<StoreOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<UserOutput | null>(null);

  const canInvite = hasPermission(user, 'users.invite');
  const canUpdate = hasPermission(user, 'users.update');

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      const [usersData, rolesData, storesData] = await Promise.all([listUsers(), listRoles(), listStores()]);
      setUsers(usersData);
      setRoles(rolesData);
      setStores(storesData);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleStatusChange(target: UserOutput, status: UserStatus): Promise<void> {
    try {
      await setUserStatus(target.id, status);
      toast.success('Estado actualizado');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo actualizar el estado');
    }
  }

  async function handleRemoveRole(assignmentId: string): Promise<void> {
    try {
      await removeUserStoreRole(assignmentId);
      toast.success('Rol removido');
      await reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo remover el rol');
    }
  }

  function storeName(storeId: string | null): string {
    if (storeId === null) {
      return 'Global';
    }
    return stores.find((store) => store.id === storeId)?.name ?? storeId;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestiona los usuarios y sus roles por tienda.</p>
        </div>
        {canInvite && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>Invitar usuario</Button>
            </DialogTrigger>
            <InviteUserDialog roles={roles} stores={stores} onSuccess={() => { setInviteOpen(false); void reload(); }} />
          </Dialog>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.email}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'active' ? 'default' : 'muted'}>{STATUS_LABELS[item.status]}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.storeRoles.map((role) => (
                      <Badge key={role.assignmentId} variant="outline" className="gap-1">
                        {role.roleName} · {storeName(role.storeId)}
                        {canUpdate && (
                          <button
                            type="button"
                            aria-label="Quitar rol"
                            className="ml-1 text-muted-foreground hover:text-foreground"
                            onClick={() => void handleRemoveRole(role.assignmentId)}
                          >
                            ×
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {canUpdate && (
                    <div className="flex justify-end gap-2">
                      <Select value={item.status} onValueChange={(value) => void handleStatusChange(item, value as UserStatus)}>
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => setAssignOpen(item)}>
                        Asignar rol
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!loading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No hay usuarios.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={assignOpen !== null} onOpenChange={(open) => !open && setAssignOpen(null)}>
        {assignOpen && (
          <AssignRoleDialog
            targetUser={assignOpen}
            roles={roles}
            stores={stores}
            onSuccess={() => {
              setAssignOpen(null);
              void reload();
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function InviteUserDialog({
  roles,
  stores,
  onSuccess,
}: {
  roles: RoleOutput[];
  stores: StoreOutput[];
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedRole = roles.find((role) => role.id === roleId);
  const requiresStore = selectedRole ? selectedRole.name !== 'Super Admin' : true;

  async function handleSubmit(): Promise<void> {
    if (!email || !name || !roleId || (requiresStore && !storeId)) {
      toast.error('Completa todos los campos');
      return;
    }
    setSubmitting(true);
    try {
      await inviteUser({ email, name, roleId, storeId: requiresStore ? storeId : undefined });
      toast.success('Invitación enviada');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo invitar al usuario');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Invitar usuario</DialogTitle>
        <DialogDescription>Se creará una invitación válida por 72 horas.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-name">Nombre</Label>
          <Input id="invite-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Rol</Label>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un rol" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {requiresStore && (
          <div className="flex flex-col gap-1.5">
            <Label>Tienda</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una tienda" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Enviando…' : 'Invitar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AssignRoleDialog({
  targetUser,
  roles,
  stores,
  onSuccess,
}: {
  targetUser: UserOutput;
  roles: RoleOutput[];
  stores: StoreOutput[];
  onSuccess: () => void;
}) {
  const [roleId, setRoleId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedRole = roles.find((role) => role.id === roleId);
  const requiresStore = selectedRole ? selectedRole.name !== 'Super Admin' : true;

  async function handleSubmit(): Promise<void> {
    if (!roleId || (requiresStore && !storeId)) {
      toast.error('Completa todos los campos');
      return;
    }
    setSubmitting(true);
    try {
      await assignUserStoreRole({ userId: targetUser.id, roleId, storeId: requiresStore ? storeId : undefined });
      toast.success('Rol asignado');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo asignar el rol');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Asignar rol a {targetUser.name}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Rol</Label>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un rol" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {requiresStore && (
          <div className="flex flex-col gap-1.5">
            <Label>Tienda</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una tienda" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Asignando…' : 'Asignar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { listScheduledTasks, runScheduledTaskNow, updateScheduledTask, type ScheduledTask } from '@/lib/api/scheduled-tasks';

export default function ScheduledTasksPage() {
  const [items, setItems] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);

  const refresh = () => {
    setLoading(true);
    return listScheduledTasks()
      .then(setItems)
      .catch((error: unknown) => toast.error(error instanceof ApiError ? error.message : 'No se pudieron cargar las tareas'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void refresh();
  }, []);

  if (user && !user.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Solo el Super Admin puede gestionar las tareas programadas.
      </div>
    );
  }

  async function withBusy(id: string, action: () => Promise<unknown>, message: string) {
    setBusy(id);
    try {
      await action();
      toast.success(message);
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Operación fallida');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tareas programadas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Runner in-app (r24): despacha outbox, drena cola de emails y libera reservas vencidas.
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarea</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Intervalo (s)</TableHead>
              <TableHead>Habilitada</TableHead>
              <TableHead>Última ejecución</TableHead>
              <TableHead>Último resultado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Sin tareas configuradas
                </TableCell>
              </TableRow>
            ) : (
              items.map((task) => (
                <TaskRow key={task.id} task={task} busy={busy} onBusy={withBusy} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  busy,
  onBusy,
}: {
  task: ScheduledTask;
  busy: string | null;
  onBusy: (id: string, action: () => Promise<unknown>, message: string) => Promise<void>;
}) {
  const [seconds, setSeconds] = useState(String(task.seconds));
  const dirty = String(task.seconds) !== seconds;
  const lastResult = task.lastError
    ? <Badge variant="muted">Error: {task.lastError.slice(0, 60)}</Badge>
    : task.lastSuccessUtc
    ? <Badge variant="outline">OK</Badge>
    : <span className="text-xs text-muted-foreground">—</span>;

  return (
    <TableRow>
      <TableCell className="font-medium">{task.name}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{task.type}</TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          min="1"
          className="ml-auto w-24 text-right tabular-nums"
          value={seconds}
          onChange={(event) => setSeconds(event.target.value)}
        />
      </TableCell>
      <TableCell>
        <Checkbox
          checked={task.enabled}
          disabled={busy === task.id}
          onCheckedChange={(checked) =>
            void onBusy(task.id, () => updateScheduledTask(task.id, { enabled: checked === true }), `Tarea ${checked ? 'habilitada' : 'deshabilitada'}`)
          }
        />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {task.lastStartUtc ? new Date(task.lastStartUtc).toLocaleString() : '—'}
      </TableCell>
      <TableCell>{lastResult}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!dirty || busy === task.id || Number(seconds) <= 0}
            onClick={() => void onBusy(task.id, () => updateScheduledTask(task.id, { seconds: Number(seconds) }), 'Intervalo actualizado')}
          >
            Guardar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy === task.id}
            onClick={() => void onBusy(task.id, () => runScheduledTaskNow(task.name), 'Tarea ejecutada')}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Ejecutar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

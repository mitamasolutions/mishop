'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/auth-store';
import { login } from '@/lib/api/auth';
import { ApiError } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkSession(): Promise<void> {
      await useAuthStore.persist.rehydrate();
      // Si hay usuario hidratado, intentar refrescar contra la cookie HttpOnly;
      // si la cookie es válida obtenemos accessToken y redirigimos.
      if (useAuthStore.getState().user) {
        const { restoreSession } = await import('@/lib/api-client');
        const ok = await restoreSession();
        if (ok) {
          router.replace('/');
        }
      }
    }
    void checkSession();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      setSession({ accessToken: result.accessToken, name: result.user.name });
      router.replace('/');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo iniciar sesión';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8">
        <h1 className="text-lg font-bold tracking-tight">mitama-commerce</h1>
        <p className="mt-1 text-sm text-muted-foreground">Inicia sesión en el panel de administración</p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  );
}

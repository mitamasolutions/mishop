'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { restoreSession } from '@/lib/api-client';

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init(): Promise<void> {
      await useAuthStore.persist.rehydrate();
      const { accessToken, user } = useAuthStore.getState();

      if (!accessToken) {
        // La cookie HttpOnly del refresh es la fuente de verdad de la sesión;
        // intentar restaurar siempre que exista usuario hidratado (o ciegamente,
        // por si la cookie sobrevivió a un wipe del store).
        const restored = user ? await restoreSession() : await restoreSession();
        if (!restored) {
          if (!cancelled) {
            router.replace('/login');
          }
          return;
        }
      }

      if (!cancelled) {
        setReady(true);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  return <>{children}</>;
}

'use client';

import { useEffect, useState } from 'react';

/**
 * Hook reutilizable de debounce (r23 · sprint1_cierre). Devuelve el valor
 * después de `delayMs` milisegundos sin cambios. Pensado para inputs de
 * búsqueda donde no queremos disparar una request por cada tecla.
 *
 * Default 300ms (criterio de aceptación r23: búsqueda con debounce ≥300ms).
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

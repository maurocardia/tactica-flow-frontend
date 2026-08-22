import { useCallback, useRef, useState } from 'react';

export type SimulatedStatus = 'idle' | 'loading' | 'done' | 'error';

// Estandariza el ciclo spinner -> check -> auto-reset que usan todos los botones simulados
// (Conectar con X, Detectar sesión, Buscar, Importar CSV, Enviar campaña, Programar...).
export function useSimulatedAction(resetAfterMs = 1800) {
  const [status, setStatus] = useState<SimulatedStatus>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setStatus('loading');
      try {
        await fn();
        setStatus('done');
      } catch {
        setStatus('error');
      } finally {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setStatus('idle'), resetAfterMs);
      }
    },
    [resetAfterMs]
  );

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus('idle');
  }, []);

  return { status, run, reset };
}

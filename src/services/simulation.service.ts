// Simula la latencia/éxito de acciones que en el mockup del cliente no tienen backend real
// (conectar una cuenta, probar un token, importar contactos, etc.). A propósito nunca falla,
// igual que en el mockup: es un prototipo visual, no una integración real.
export function simulate<T>(result: T, opts?: { minMs?: number; maxMs?: number }): Promise<T> {
  const min = opts?.minMs ?? 600;
  const max = opts?.maxMs ?? 1400;
  const delay = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(() => resolve(result), delay));
}

const STORAGE_KEY = 'tf_prototype_state_v1';

export async function loadPersistedState<T>(): Promise<Partial<T> | null> {
  try {
    if (!chrome?.storage?.local) return null;
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as Partial<T>) ?? null;
  } catch (err) {
    console.error('[persistence] Error leyendo estado guardado:', err);
    return null;
  }
}

export function savePersistedState<T>(state: T): void {
  try {
    if (!chrome?.storage?.local) return;
    chrome.storage.local.set({ [STORAGE_KEY]: state });
  } catch (err) {
    console.error('[persistence] Error guardando estado:', err);
  }
}

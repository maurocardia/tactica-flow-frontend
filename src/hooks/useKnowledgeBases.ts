import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@/services/api.service';
import { KnowledgeBase, KnowledgeBaseInput } from '@/types/knowledgeBase';

export function useKnowledgeBases() {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBases(await ApiService.getKnowledgeBases());
    } catch (err) {
      console.error('[useKnowledgeBases] Error al cargar bases:', err);
      setError('No se pudieron cargar las bases de conocimiento. ¿Está corriendo el backend?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (data: KnowledgeBaseInput) => {
    const created = await ApiService.createKnowledgeBase(data);
    setBases((prev) => [created, ...prev]);
    return created;
  };

  const update = async (id: number, data: Partial<KnowledgeBaseInput>) => {
    const updated = await ApiService.updateKnowledgeBase(id, data);
    setBases((prev) => prev.map((b) => (b.id === id ? updated : b)));
    return updated;
  };

  const remove = async (id: number) => {
    await ApiService.deleteKnowledgeBase(id);
    setBases((prev) => prev.filter((b) => b.id !== id));
  };

  return { bases, loading, error, reload: load, create, update, remove };
}

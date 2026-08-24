import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiService } from '@/services/api.service';
import { KnowledgeBase, KnowledgeBaseInput } from '@/types/knowledgeBase';

interface KnowledgeBaseContextValue {
  bases: KnowledgeBase[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  create: (data: KnowledgeBaseInput) => Promise<KnowledgeBase>;
  update: (id: number, data: Partial<KnowledgeBaseInput>) => Promise<KnowledgeBase>;
  remove: (id: number) => Promise<void>;
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextValue | null>(null);

// Estado único y compartido de las bases de conocimiento — antes cada componente que llamaba al
// hook tenía su propia copia aislada, así que subir/crear una base en el modal (KnowledgeBaseModal)
// no se reflejaba en el selector de ChatbotModule hasta recargar toda la página.
export const KnowledgeBaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBases(await ApiService.getKnowledgeBases());
    } catch (err) {
      console.error('[KnowledgeBaseContext] Error al cargar bases:', err);
      setError('No se pudieron cargar las bases de conocimiento. ¿Está corriendo el backend?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

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

  const value: KnowledgeBaseContextValue = { bases, loading, error, reload, create, update, remove };

  return <KnowledgeBaseContext.Provider value={value}>{children}</KnowledgeBaseContext.Provider>;
};

export function useKnowledgeBases(): KnowledgeBaseContextValue {
  const ctx = useContext(KnowledgeBaseContext);
  if (!ctx) throw new Error('useKnowledgeBases debe usarse dentro de <KnowledgeBaseProvider>');
  return ctx;
}

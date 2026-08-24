import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { useKnowledgeBases } from '@/state/KnowledgeBaseContext';
import { KbCard } from './KbCard';

export const KnowledgeBaseModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { bases, loading, error, create, update, remove } = useKnowledgeBases();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      await create({ title: title.trim(), description: description.trim() });
      setTitle('');
      setDescription('');
      setCreating(false);
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo crear la base.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta base de conocimiento y todos sus documentos?')) return;
    try {
      await remove(id);
    } catch (err) {
      console.error('[KnowledgeBaseModal] Error al eliminar:', err);
    }
  };

  return (
    <Modal title="Bases de conocimiento" onClose={onClose} maxWidth="max-w-[440px]">
      {error && <div className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-3 justify-center">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando bases...
        </div>
      ) : (
        <>
          {bases.length === 0 && !creating && <EmptyState>Todavía no hay bases de conocimiento.</EmptyState>}
          <div className="flex flex-col gap-2">
            {bases.map((base) => (
              <KbCard
                key={base.id}
                base={base}
                onToggleActive={(active) => update(base.id, { isActive: active }).catch((err) => console.error(err))}
                onDelete={() => handleDelete(base.id)}
              />
            ))}
          </div>
        </>
      )}

      {creating ? (
        <div className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2">
          {formError && <p className="text-[11px] text-red-600">{formError}</p>}
          <Field label="Título">
            <input className={fieldInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Ventas" />
          </Field>
          <Field label="Descripción">
            <input className={fieldInputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </Field>
          <div className="flex gap-2">
            <button onClick={() => setCreating(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 rounded-lg">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || saving}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Crear
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2 rounded-lg"
        >
          <Plus className="w-3.5 h-3.5" /> Nueva base
        </button>
      )}
    </Modal>
  );
};

export default KnowledgeBaseModal;

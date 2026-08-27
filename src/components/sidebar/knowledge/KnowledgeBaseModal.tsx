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
    <Modal
      title="Bases de conocimiento"
      onClose={onClose}
      maxWidth="max-w-[460px]"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          {!creating ? (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 bg-[#9e1114] hover:bg-[#800d10] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" /> Nueva base
            </button>
          ) : <div />}
          <button
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      }
    >
      {error && <div className="text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-3 justify-center">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando bases...
        </div>
      ) : (
        <>
          {bases.length === 0 && !creating && <EmptyState>Todavía no hay bases de conocimiento.</EmptyState>}
          <div className="flex flex-col gap-2.5">
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

      {creating && (
        <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-900/80 flex flex-col gap-2.5 shadow-2xs">
          {formError && <p className="text-xs font-bold text-red-600 dark:text-red-400">{formError}</p>}
          <Field label="Título">
            <input className={fieldInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Ventas / Catálogo de Productos" />
          </Field>
          <Field label="Descripción">
            <input className={fieldInputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </Field>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setCreating(false)} className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer transition-all">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || saving}
              className="flex-1 bg-[#9e1114] hover:bg-[#800d10] disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Crear
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default KnowledgeBaseModal;

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';
import { MessageTemplate } from '@/types/template';
import { useAppState } from '@/state/AppStateContext';
import { TemplateList } from './TemplateList';
import { TemplateEditor } from './TemplateEditor';
import { SegmentSender } from './SegmentSender';

export const TemplatesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { templates, setTemplates } = useAppState();
  const [editing, setEditing] = useState<MessageTemplate | 'new' | null>(null);

  const handleSave = (data: Omit<MessageTemplate, 'id'>) => {
    if (editing && editing !== 'new') {
      setTemplates((prev) => prev.map((t) => (t.id === editing.id ? { ...t, ...data } : t)));
    } else {
      setTemplates((prev) => [{ id: `tpl-${Date.now()}`, ...data }, ...prev]);
    }
    setEditing(null);
  };

  return (
    <Modal
      title="Plantillas"
      onClose={onClose}
      maxWidth="max-w-[460px]"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          {!editing ? (
            <button
              onClick={() => setEditing('new')}
              className="flex items-center gap-1.5 bg-[#9e1114] hover:bg-[#800d10] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" /> Nueva plantilla
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
      <PrototypeNotice text="Próximamente: el envío segmentado todavía no manda mensajes reales." />
      {editing ? (
        <TemplateEditor initial={editing === 'new' ? null : editing} onSave={handleSave} onCancel={() => setEditing(null)} />
      ) : (
        <>
          {templates.length === 0 ? (
            <EmptyState>Todavía no hay plantillas.</EmptyState>
          ) : (
            <TemplateList
              templates={templates}
              onUse={() => onClose()}
              onEdit={setEditing}
              onDelete={(id) => setTemplates((prev) => prev.filter((t) => t.id !== id))}
            />
          )}
          {templates.length > 0 && <SegmentSender templates={templates} />}
        </>
      )}
    </Modal>
  );
};

export default TemplatesModal;

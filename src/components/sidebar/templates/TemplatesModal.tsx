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
    <Modal title="Plantillas" onClose={onClose} maxWidth="max-w-[460px]">
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
          <button
            onClick={() => setEditing('new')}
            className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva plantilla
          </button>
          {templates.length > 0 && <SegmentSender templates={templates} />}
        </>
      )}
    </Modal>
  );
};

export default TemplatesModal;

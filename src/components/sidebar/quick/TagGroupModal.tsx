import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { TagInput } from '@/components/ui/TagInput';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';
import { useAppState } from '@/state/AppStateContext';

const GROUP_MEMBERS = [
  { name: 'Juan Pérez', phone: '+54 9 11 4444-8899' },
  { name: 'María Gómez', phone: '+54 9 11 5555-2233' },
  { name: 'Carlos Ríos', phone: '+54 9 11 6666-1010' },
];

export const TagGroupModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { tags, setTags } = useAppState();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) setTags((prev) => [...prev, tag]);
    setSelectedTag(tag);
  };

  const toggleMember = (phone: string) => setChecked((prev) => ({ ...prev, [phone]: !prev[phone] }));

  const apply = () => {
    setSaving(true);
    setTimeout(() => onClose(), 700);
  };

  return (
    <Modal
      title="Etiquetar contactos del grupo"
      onClose={onClose}
      footer={
        <button
          onClick={apply}
          disabled={!selectedTag || saving}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Aplicar etiqueta
        </button>
      }
    >
      <PrototypeNotice />
      <TagInput suggestions={tags} onAdd={addTag} />
      {selectedTag && (
        <p className="text-[11px] text-slate-600">
          Etiqueta seleccionada: <b className="text-red-700">{selectedTag}</b>
        </p>
      )}
      <div className="flex flex-col divide-y divide-slate-100 border border-slate-200 rounded-lg">
        {GROUP_MEMBERS.map((m) => (
          <label key={m.phone} className="flex items-center gap-2 px-2.5 py-2 text-[11.5px]">
            <input type="checkbox" checked={!!checked[m.phone]} onChange={() => toggleMember(m.phone)} />
            <span className="font-semibold text-slate-700">{m.name}</span>
            <span className="text-slate-400 ml-auto">{m.phone}</span>
          </label>
        ))}
      </div>
      <p className="text-[10.5px] text-slate-500">Las etiquetas se sincronizan con los filtros y envíos de TACTICA.</p>
    </Modal>
  );
};

export default TagGroupModal;

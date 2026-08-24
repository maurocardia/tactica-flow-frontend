import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';

const TYPES = ['Charla', 'Llamada', 'Email', 'Reunión'];

export const SaveHistoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [type, setType] = useState(TYPES[0]);
  const [title, setTitle] = useState('');
  const [downloadAttachments, setDownloadAttachments] = useState(true);
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    setTimeout(() => onClose(), 700);
  };

  return (
    <Modal
      title="Guardar en historial"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar
          </button>
        </>
      }
    >
      <PrototypeNotice />
      <Field label="Tipo de actividad">
        <select className={fieldInputClass} value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Título">
        <input className={fieldInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Llamada de seguimiento" />
      </Field>
      <label className="flex items-center gap-2 text-[11px] text-slate-600">
        <input type="checkbox" checked={downloadAttachments} onChange={(e) => setDownloadAttachments(e.target.checked)} />
        Descargar adjuntos del chat
      </label>
    </Modal>
  );
};

export default SaveHistoryModal;

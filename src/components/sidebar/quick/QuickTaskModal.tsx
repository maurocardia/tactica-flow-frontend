import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';

export const QuickTaskModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [subject, setSubject] = useState('');
  const [responsible, setResponsible] = useState('H. López');
  const [due, setDue] = useState('');
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    setTimeout(() => onClose(), 700);
  };

  return (
    <Modal
      title="Nueva tarea pendiente"
      onClose={onClose}
      footer={
        <button
          onClick={save}
          disabled={!subject || saving}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Crear tarea
        </button>
      }
    >
      <PrototypeNotice />
      <Field label="Asunto">
        <input className={fieldInputClass} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ej: Llamar para confirmar pedido" />
      </Field>
      <Field label="Responsable">
        <input className={fieldInputClass} value={responsible} onChange={(e) => setResponsible(e.target.value)} />
      </Field>
      <Field label="Vence">
        <input type="datetime-local" className={fieldInputClass} value={due} onChange={(e) => setDue(e.target.value)} />
      </Field>
    </Modal>
  );
};

export default QuickTaskModal;

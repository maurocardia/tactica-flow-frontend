import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';

const TYPES = ['Llamada', 'Reunión', 'Email', 'Visita'];

export const ScheduleActivityModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [type, setType] = useState(TYPES[0]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [datetime, setDatetime] = useState('');
  const [reminder, setReminder] = useState('');
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    setTimeout(() => onClose(), 700);
  };

  return (
    <Modal
      title="Programar actividad"
      onClose={onClose}
      footer={
        <button
          onClick={save}
          disabled={!subject || saving}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Programar
        </button>
      }
    >
      <PrototypeNotice />
      <Field label="Tipo">
        <select className={fieldInputClass} value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Asunto">
        <input className={fieldInputClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label="Descripción">
        <textarea className={fieldInputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Fecha y hora">
        <input type="datetime-local" className={fieldInputClass} value={datetime} onChange={(e) => setDatetime(e.target.value)} />
      </Field>
      <Field label="Recordatorio (opcional, ej: '30 min antes')">
        <input className={fieldInputClass} value={reminder} onChange={(e) => setReminder(e.target.value)} placeholder="30 min antes" />
      </Field>
    </Modal>
  );
};

export default ScheduleActivityModal;

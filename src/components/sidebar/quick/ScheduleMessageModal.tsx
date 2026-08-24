import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';
import { useAppState } from '@/state/AppStateContext';

const REPETITIONS = ['Una vez', 'Diario', 'Semanal', 'Mensual'];

export const ScheduleMessageModal: React.FC<{ onClose: () => void; contactName: string }> = ({ onClose, contactName }) => {
  const { setScheduledMessages } = useAppState();
  const [text, setText] = useState('');
  const [datetime, setDatetime] = useState('');
  const [repetition, setRepetition] = useState(REPETITIONS[0]);
  const [stopIfReplies, setStopIfReplies] = useState(true);
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setScheduledMessages((prev) => [
        {
          id: `sched-${Date.now()}`,
          contactName,
          scope: 'este',
          text,
          datetimeLabel: datetime ? new Date(datetime).toLocaleString('es-AR') : 'Sin definir',
          recurrenceLabel: repetition,
          active: true,
        },
        ...prev,
      ]);
      onClose();
    }, 700);
  };

  return (
    <Modal
      title="Programar mensaje"
      onClose={onClose}
      footer={
        <button
          onClick={save}
          disabled={!text || saving}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Programar
        </button>
      }
    >
      <PrototypeNotice text="Próximamente: el mensaje se guarda acá, pero todavía no se envía solo a la hora indicada." />
      <Field label="Fecha y hora de envío">
        <input type="datetime-local" className={fieldInputClass} value={datetime} onChange={(e) => setDatetime(e.target.value)} />
      </Field>
      <Field label="Repetición">
        <select className={fieldInputClass} value={repetition} onChange={(e) => setRepetition(e.target.value)}>
          {REPETITIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>
      <Field label="Mensaje">
        <textarea className={fieldInputClass} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Texto a enviar..." />
      </Field>
      <label className="flex items-center gap-2 text-[11px] text-slate-600">
        <input type="checkbox" checked={stopIfReplies} onChange={(e) => setStopIfReplies(e.target.checked)} />
        Detener si el contacto responde antes
      </label>
    </Modal>
  );
};

export default ScheduleMessageModal;

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';
import { useSimulatedAction } from '@/hooks/useSimulatedAction';
import { simulate } from '@/services/simulation.service';

const TEAMMATES = ['H. López', 'M. Gómez', 'F. Torres', 'C. Ramírez'];

export const ReassignModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [scope, setScope] = useState('solo-chat');
  const [teammate, setTeammate] = useState(TEAMMATES[0]);
  const { status, run } = useSimulatedAction();

  const confirm = () => run(() => simulate(undefined)).then(() => setTimeout(onClose, 900));

  return (
    <Modal
      title="Reasignar conversación"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={confirm}
            disabled={status === 'loading'}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
          >
            {status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {status === 'done' ? 'Reasignado ✓' : 'Reasignar'}
          </button>
        </>
      }
    >
      <PrototypeNotice />
      <Field label="Alcance">
        <select className={fieldInputClass} value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="solo-chat">Solo este chat</option>
          <option value="contacto">Todo el contacto</option>
        </select>
      </Field>
      <Field label="Asignar a">
        <select className={fieldInputClass} value={teammate} onChange={(e) => setTeammate(e.target.value)}>
          {TEAMMATES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
    </Modal>
  );
};

export default ReassignModal;

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';

export const GoToRecordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [kind, setKind] = useState<'empresa' | 'contacto'>('contacto');

  return (
    <Modal
      title="Ir a ficha"
      onClose={onClose}
      footer={
        <button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2 rounded-lg">
          Ir
        </button>
      }
    >
      <PrototypeNotice />
      <Field label="Tipo de registro">
        <select className={fieldInputClass} value={kind} onChange={(e) => setKind(e.target.value as any)}>
          <option value="contacto">Ficha de contacto</option>
          <option value="empresa">Ficha de empresa</option>
        </select>
      </Field>
      <p className="text-[11px] text-slate-500">
        Abre el registro vinculado de {kind === 'contacto' ? 'este contacto' : 'la empresa asociada'} en TACTICA.
      </p>
    </Modal>
  );
};

export default GoToRecordModal;

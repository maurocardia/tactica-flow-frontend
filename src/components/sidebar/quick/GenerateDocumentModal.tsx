import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';
import { useSimulatedAction } from '@/hooks/useSimulatedAction';
import { simulate } from '@/services/simulation.service';

const DOC_TYPES = ['Presupuesto', 'Pedido', 'Entrega', 'Factura', 'Orden de compra', 'Incidente', 'Actividad'];

export const GenerateDocumentModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const { status, run } = useSimulatedAction();

  const generate = () => run(() => simulate(undefined));

  return (
    <Modal
      title="Nueva acción desde el chat"
      onClose={onClose}
      footer={
        <button
          onClick={generate}
          disabled={status === 'loading'}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
        >
          {status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {status === 'done' ? `${docType} generado ✓` : `Generar ${docType.toLowerCase()}`}
        </button>
      }
    >
      <PrototypeNotice />
      <Field label="Qué querés generar">
        <select className={fieldInputClass} value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOC_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <p className="text-[11px] text-slate-500">Se precarga con los datos de la charla actual.</p>
    </Modal>
  );
};

export default GenerateDocumentModal;

import React, { useState } from 'react';
import { Phone, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';
import { useSimulatedAction } from '@/hooks/useSimulatedAction';
import { simulate } from '@/services/simulation.service';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

export const DialerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [number, setNumber] = useState('');
  const { status, run } = useSimulatedAction();

  const call = () => run(() => simulate(undefined));

  return (
    <Modal title="Marcador" onClose={onClose}>
      <PrototypeNotice text="Próximamente: todavía no hace una llamada real." />
      <div className="text-center text-xl py-3 bg-slate-50 rounded-lg min-h-[44px] font-mono tracking-wider">
        {number || <span className="text-slate-300">Ingresá un número</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setNumber((n) => n + k)}
            className="bg-slate-100 hover:bg-red-50 text-red-900 text-lg py-3 rounded-lg font-semibold"
          >
            {k}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setNumber((n) => n.slice(0, -1))}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 rounded-lg"
        >
          Borrar
        </button>
        <button
          onClick={call}
          disabled={!number || status === 'loading'}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"
        >
          {status === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
          {status === 'done' ? 'Llamando…' : 'Llamar'}
        </button>
      </div>
    </Modal>
  );
};

export default DialerModal;

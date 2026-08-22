import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';
import { INCOMING_LEAD_CHANNELS } from '@/config/channels';
import { useAppState } from '@/state/AppStateContext';
import { LeadChannelRule, LeadRuleState } from './LeadChannelRule';

export const IncomingLeadsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { tags } = useAppState();
  const [rules, setRules] = useState<Record<string, LeadRuleState>>(() =>
    Object.fromEntries(
      INCOMING_LEAD_CHANNELS.map((c) => [c.id, { enabled: false, assignedTo: 'H. López', tag: tags[0] ?? '', aiReply: false }])
    )
  );
  const [roundRobin, setRoundRobin] = useState(false);
  const [aiWhileRouting, setAiWhileRouting] = useState(true);
  const [logHistory, setLogHistory] = useState(true);

  return (
    <Modal title="Leads entrantes de redes sociales" onClose={onClose} maxWidth="max-w-[460px]" footer={
      <button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2 rounded-lg">
        Listo
      </button>
    }>
      <PrototypeNotice text="Próximamente: todavía no llegan leads reales desde Facebook, Instagram, TikTok ni Mercado Libre." />
      {INCOMING_LEAD_CHANNELS.map((channel) => (
        <LeadChannelRule
          key={channel.id}
          channel={channel}
          rule={rules[channel.id]}
          onChange={(patch) => setRules((prev) => ({ ...prev, [channel.id]: { ...prev[channel.id], ...patch } }))}
        />
      ))}

      <div className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2">
        <h4 className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Configuración general</h4>
        <div className="flex items-center justify-between">
          <span>Asignación round-robin entre el equipo</span>
          <Toggle size="sm" checked={roundRobin} onChange={setRoundRobin} />
        </div>
        <div className="flex items-center justify-between">
          <span>Respuesta con IA mientras se deriva</span>
          <Toggle size="sm" checked={aiWhileRouting} onChange={setAiWhileRouting} />
        </div>
        <div className="flex items-center justify-between">
          <span>Registrar en el historial de TACTICA</span>
          <Toggle size="sm" checked={logHistory} onChange={setLogHistory} />
        </div>
      </div>
    </Modal>
  );
};

export default IncomingLeadsModal;

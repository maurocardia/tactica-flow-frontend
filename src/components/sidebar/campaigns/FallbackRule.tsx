import React from 'react';
import { CampaignStep, FallbackMode } from '@/types/campaign';
import { CAMPAIGN_CHANNELS } from '@/config/channels';

const LABELS: Record<FallbackMode, string> = {
  otro: 'Usar otro canal',
  saltar: 'Saltar al siguiente paso',
  omitir: 'Omitir el contacto',
  esperar: 'Esperar / dejar pendiente',
};

export const FallbackRule: React.FC<{ step: CampaignStep; onChange: (patch: Partial<CampaignStep>) => void }> = ({ step, onChange }) => (
  <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10.5px] text-slate-600">
    <span>Si no responde:</span>
    <select
      className="border border-slate-300 rounded-md px-1.5 py-1 text-[10.5px] bg-white text-slate-800 [color-scheme:light]"
      value={step.fallbackMode}
      onChange={(e) => onChange({ fallbackMode: e.target.value as FallbackMode })}
    >
      {(Object.keys(LABELS) as FallbackMode[]).map((m) => (
        <option key={m} value={m}>{LABELS[m]}</option>
      ))}
    </select>
    {step.fallbackMode === 'otro' && (
      <select
        className="border border-slate-300 rounded-md px-1.5 py-1 text-[10.5px] bg-white text-slate-800 [color-scheme:light]"
        value={step.fallbackChannel ?? CAMPAIGN_CHANNELS[0].id}
        onChange={(e) => onChange({ fallbackChannel: e.target.value as any })}
      >
        {CAMPAIGN_CHANNELS.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
    )}
  </div>
);

export default FallbackRule;

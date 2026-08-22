import React from 'react';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { CampaignStep, StepKind } from '@/types/campaign';
import { CAMPAIGN_CHANNELS } from '@/config/channels';
import { FallbackRule } from './FallbackRule';

interface Props {
  step: CampaignStep;
  index: number;
  total: number;
  onChange: (patch: Partial<CampaignStep>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}

export const CampaignStepRow: React.FC<Props> = ({ step, index, total, onChange, onMove, onDelete }) => (
  <div className="border border-slate-200 rounded-lg p-2.5 bg-white flex flex-col gap-2">
    <div className="flex items-center gap-1.5">
      <span
        className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
        style={{ backgroundColor: '#9e1114' }}
      >
        {index + 1}
      </span>
      <div className="inline-flex border border-slate-200 rounded-lg overflow-hidden">
        {CAMPAIGN_CHANNELS.map((c) => (
          <button
            key={c.id}
            onClick={() => onChange({ channel: c.id })}
            className={`px-2 py-1 text-[10px] font-bold ${step.channel === c.id ? 'bg-red-600 text-white' : 'bg-white text-slate-500'}`}
          >
            {c.shortLabel}
          </button>
        ))}
      </div>
      <div className="ml-auto flex gap-1">
        <button onClick={() => onMove(-1)} disabled={index === 0} className="border border-slate-200 rounded-md p-1 disabled:opacity-30">
          <ArrowUp className="w-3 h-3" />
        </button>
        <button onClick={() => onMove(1)} disabled={index === total - 1} className="border border-slate-200 rounded-md p-1 disabled:opacity-30">
          <ArrowDown className="w-3 h-3" />
        </button>
        <button onClick={onDelete} className="border border-slate-200 rounded-md p-1 text-red-500">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>

    <div className="flex gap-1.5">
      <input
        className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-[11px] bg-white text-slate-800 [color-scheme:light]"
        value={step.delayLabel}
        onChange={(e) => onChange({ delayLabel: e.target.value })}
        placeholder="Ej: +2 días · si no respondió"
      />
      <select
        className="w-[78px] border border-slate-300 rounded-md px-1.5 py-1 text-[11px] bg-white text-slate-800 [color-scheme:light]"
        value={step.kind}
        onChange={(e) => onChange({ kind: e.target.value as StepKind })}
      >
        <option value="fijo">Fijo</option>
        <option value="ia">IA</option>
      </select>
    </div>

    <textarea
      className="w-full text-[11.5px] border border-slate-200 rounded-md p-2 resize-y min-h-[44px] bg-white text-slate-800"
      value={step.text}
      onChange={(e) => onChange({ text: e.target.value })}
      placeholder={step.kind === 'fijo' ? 'Texto del mensaje...' : 'Instrucción para la IA...'}
    />

    <label className="flex items-center gap-1.5 text-[11px] text-purple-700">
      <input type="checkbox" checked={step.useChatContext} onChange={(e) => onChange({ useChatContext: e.target.checked })} />
      ✨ Usar la info de la charla para redactar con IA
    </label>

    <FallbackRule step={step} onChange={onChange} />
  </div>
);

export default CampaignStepRow;

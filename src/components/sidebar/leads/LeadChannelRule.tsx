import React from 'react';
import { ChannelDefinition } from '@/config/channels';
import { Toggle } from '@/components/ui/Toggle';
import { useAppState } from '@/state/AppStateContext';

const TEAMMATES = ['H. López', 'M. Gómez', 'F. Torres', 'C. Ramírez'];

export interface LeadRuleState {
  enabled: boolean;
  assignedTo: string;
  tag: string;
  aiReply: boolean;
}

interface Props {
  channel: ChannelDefinition;
  rule: LeadRuleState;
  onChange: (patch: Partial<LeadRuleState>) => void;
}

export const LeadChannelRule: React.FC<Props> = ({ channel, rule, onChange }) => {
  const { tags } = useAppState();

  return (
    <div className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${channel.color}`}>{channel.shortLabel}</span>
        <span className="font-bold text-[12px] text-slate-700">{channel.label}</span>
        <Toggle size="sm" checked={rule.enabled} onChange={(v) => onChange({ enabled: v })} />
      </div>
      {rule.enabled && (
        <div className="flex flex-wrap gap-2">
          <select
            className="flex-1 min-w-[110px] border border-slate-300 rounded-md px-2 py-1 text-[11px] bg-white text-slate-800 [color-scheme:light]"
            value={rule.assignedTo}
            onChange={(e) => onChange({ assignedTo: e.target.value })}
          >
            {TEAMMATES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            className="flex-1 min-w-[110px] border border-slate-300 rounded-md px-2 py-1 text-[11px] bg-white text-slate-800 [color-scheme:light]"
            value={rule.tag}
            onChange={(e) => onChange({ tag: e.target.value })}
          >
            {tags.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-[11px] text-purple-700 w-full">
            <input type="checkbox" checked={rule.aiReply} onChange={(e) => onChange({ aiReply: e.target.checked })} />
            ✨ Respuesta automática con IA
          </label>
        </div>
      )}
    </div>
  );
};

export default LeadChannelRule;

import React from 'react';
import { MockResult } from './sourcesData';
import { CHANNELS } from '@/config/channels';

interface Props {
  results: MockResult[];
  checked: Record<number, boolean>;
  onToggle: (index: number) => void;
}

export const ResultsChecklist: React.FC<Props> = ({ results, checked, onToggle }) => (
  <div className="border border-slate-200 rounded-lg max-h-[190px] overflow-y-auto divide-y divide-slate-100">
    {results.map((r, i) => (
      <label key={i} className="flex items-center gap-2 px-2.5 py-2 text-[11.5px]">
        <input type="checkbox" checked={!!checked[i]} onChange={() => onToggle(i)} />
        <span className="min-w-0 flex-1">
          <span className="font-semibold text-slate-700">{r.name}</span>
          {r.company && <span className="text-slate-400"> · {r.company}</span>}
        </span>
        <span className="flex gap-1 shrink-0">
          {r.channels.map((c) => (
            <span key={c} className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold ${CHANNELS[c].color}`}>
              {CHANNELS[c].shortLabel[0]}
            </span>
          ))}
        </span>
      </label>
    ))}
  </div>
);

export default ResultsChecklist;

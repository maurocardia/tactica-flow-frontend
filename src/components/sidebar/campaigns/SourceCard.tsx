import React from 'react';
import { SourceDef } from './sourcesData';

export const SourceCard: React.FC<{ source: SourceDef; active: boolean; onClick: () => void }> = ({ source, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 border rounded-lg p-2.5 text-left text-[11.5px] font-semibold ${
      active ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:bg-slate-50'
    }`}
  >
    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${source.color}`}>
      {source.icon.toUpperCase()}
    </span>
    <span className="min-w-0">
      <span className="block truncate">{source.label}</span>
      <span className="block font-normal text-[10px] text-slate-500 truncate">{source.description}</span>
    </span>
  </button>
);

export default SourceCard;

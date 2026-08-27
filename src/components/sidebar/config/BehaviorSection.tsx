import React from 'react';
import { Toggle } from '@/components/ui/Toggle';
import { useAppState } from '@/state/AppStateContext';

export const BehaviorSection: React.FC = () => {
  const { config, setConfig } = useAppState();

  return (
    <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xs">
      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100">Comportamiento de IA</h4>
      <div className="flex items-center justify-between py-1 text-xs text-slate-800 dark:text-slate-200 font-semibold">
        <span>Resumir la charla automáticamente al abrirla</span>
        <Toggle checked={config.autoSummarizeOnOpen} onChange={(v) => setConfig((c) => ({ ...c, autoSummarizeOnOpen: v }))} size="sm" />
      </div>
      <div className="flex items-center justify-between py-1 text-xs text-slate-800 dark:text-slate-200 font-semibold">
        <span>Transcribir audios automáticamente</span>
        <Toggle checked={config.autoTranscribe} onChange={(v) => setConfig((c) => ({ ...c, autoTranscribe: v }))} size="sm" />
      </div>
    </div>
  );
};

export default BehaviorSection;

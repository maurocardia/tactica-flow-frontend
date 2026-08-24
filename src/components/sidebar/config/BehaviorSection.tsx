import React from 'react';
import { Toggle } from '@/components/ui/Toggle';
import { useAppState } from '@/state/AppStateContext';

export const BehaviorSection: React.FC = () => {
  const { config, setConfig } = useAppState();

  return (
    <div className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2">
      <h4 className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Comportamiento de IA</h4>
      <div className="flex items-center justify-between">
        <span>Resumir la charla automáticamente al abrirla</span>
        <Toggle checked={config.autoSummarizeOnOpen} onChange={(v) => setConfig((c) => ({ ...c, autoSummarizeOnOpen: v }))} size="sm" />
      </div>
      <div className="flex items-center justify-between">
        <span>Transcribir audios automáticamente</span>
        <Toggle checked={config.autoTranscribe} onChange={(v) => setConfig((c) => ({ ...c, autoTranscribe: v }))} size="sm" />
      </div>
    </div>
  );
};

export default BehaviorSection;

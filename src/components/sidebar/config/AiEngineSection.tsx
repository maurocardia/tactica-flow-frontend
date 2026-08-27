import React from 'react';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { useAppState } from '@/state/AppStateContext';

const PROVIDERS = ['Gemini', 'OpenAI', 'Claude', 'Otro'];

export const AiEngineSection: React.FC = () => {
  const { config, setConfig } = useAppState();

  return (
    <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xs">
      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100">Motor de IA</h4>
      <Field label="Proveedor">
        <select className={fieldInputClass} value={config.aiProvider} onChange={(e) => setConfig((c) => ({ ...c, aiProvider: e.target.value }))}>
          {PROVIDERS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>
      <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
        El proveedor real de IA se configura en el backend. Este selector solo ajusta cómo se muestra en el panel.
      </p>
    </div>
  );
};

export default AiEngineSection;

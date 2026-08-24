import React from 'react';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { useAppState } from '@/state/AppStateContext';

const PROVIDERS = ['Gemini', 'OpenAI', 'Claude', 'Otro'];

export const AiEngineSection: React.FC = () => {
  const { config, setConfig } = useAppState();

  return (
    <div className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2.5">
      <h4 className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Motor de IA</h4>
      <Field label="Proveedor">
        <select className={fieldInputClass} value={config.aiProvider} onChange={(e) => setConfig((c) => ({ ...c, aiProvider: e.target.value }))}>
          {PROVIDERS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>
      <p className="text-[10.5px] text-slate-500">
        El proveedor real de IA se configura en el backend. Este selector solo ajusta cómo se muestra en el panel.
      </p>
    </div>
  );
};

export default AiEngineSection;

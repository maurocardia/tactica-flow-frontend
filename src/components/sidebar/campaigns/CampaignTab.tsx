import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { useAppState } from '@/state/AppStateContext';
import { CampaignStepRow } from './CampaignStepRow';
import { Toggle } from '@/components/ui/Toggle';
import { useSimulatedAction } from '@/hooks/useSimulatedAction';
import { simulate } from '@/services/simulation.service';
import { CAMPAIGN_CHANNELS } from '@/config/channels';

export const CampaignTab: React.FC = () => {
  const { campaignSteps, setCampaignSteps } = useAppState();
  const [stopIfReplies, setStopIfReplies] = useState(true);
  const [rotateAccounts, setRotateAccounts] = useState(false);
  const [logHistory, setLogHistory] = useState(true);
  const [logMode, setLogMode] = useState<'todo' | 'resumen'>('resumen');
  const { status, run } = useSimulatedAction();

  const updateStep = (id: string, patch: Partial<(typeof campaignSteps)[number]>) =>
    setCampaignSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const moveStep = (index: number, dir: -1 | 1) => {
    setCampaignSteps((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const deleteStep = (id: string) => setCampaignSteps((prev) => prev.filter((s) => s.id !== id));

  const addStep = () =>
    setCampaignSteps((prev) => [
      ...prev,
      {
        id: `step-${Date.now()}`,
        channel: CAMPAIGN_CHANNELS[0].id,
        delayLabel: 'Inmediato',
        kind: 'fijo',
        text: '',
        useChatContext: false,
        fallbackMode: 'esperar',
      },
    ]);

  const launch = () => run(() => simulate(undefined));

  return (
    <div className="flex flex-col gap-2.5">
      {campaignSteps.map((step, i) => (
        <CampaignStepRow
          key={step.id}
          step={step}
          index={i}
          total={campaignSteps.length}
          onChange={(patch) => updateStep(step.id, patch)}
          onMove={(dir) => moveStep(i, dir)}
          onDelete={() => deleteStep(step.id)}
        />
      ))}

      <button
        onClick={addStep}
        className="flex items-center justify-center gap-1.5 border border-dashed border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold text-xs py-2 rounded-lg"
      >
        <Plus className="w-3.5 h-3.5" /> Agregar paso
      </button>

      <div className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span>Detener si responde por cualquier canal</span>
          <Toggle size="sm" checked={stopIfReplies} onChange={setStopIfReplies} />
        </div>
        <div className="flex items-center justify-between">
          <span>Rotar entre cuentas del canal (round-robin)</span>
          <Toggle size="sm" checked={rotateAccounts} onChange={setRotateAccounts} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Registrar en el historial de TACTICA</span>
          <Toggle size="sm" checked={logHistory} onChange={setLogHistory} />
        </div>
        {logHistory && (
          <select
            className="border border-slate-300 rounded-md px-2 py-1 text-[11px] self-end bg-white text-slate-800 [color-scheme:light]"
            value={logMode}
            onChange={(e) => setLogMode(e.target.value as any)}
          >
            <option value="resumen">Solo resumen final</option>
            <option value="todo">Cada acción</option>
          </select>
        )}
      </div>

      <p className="text-[10px] text-slate-500 bg-slate-50 rounded-lg p-2">
        Límites anti-bloqueo: WhatsApp 40/día · Email 80/día · LinkedIn 25 msg/día + 15 invitaciones/día (modo semiautomático).
      </p>

      <button
        onClick={launch}
        disabled={status === 'loading' || campaignSteps.length === 0}
        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"
      >
        {status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {status === 'done' ? 'Campaña iniciada ✓' : 'Iniciar campaña'}
      </button>
    </div>
  );
};

export default CampaignTab;

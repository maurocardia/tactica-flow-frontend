import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';
import { useAppState } from '@/state/AppStateContext';
import { useSimulatedAction } from '@/hooks/useSimulatedAction';
import { simulate } from '@/services/simulation.service';

export const WhatsAppModeSection: React.FC = () => {
  const { config, setConfig } = useAppState();
  const { status, run } = useSimulatedAction();

  const testConnection = () =>
    run(async () => {
      setConfig((c) => ({ ...c, cloudConnectionStatus: 'testing' }));
      await simulate(undefined, { minMs: 500, maxMs: 900 });
      setConfig((c) => ({ ...c, cloudConnectionStatus: 'connected' }));
    });

  return (
    <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xs">
      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100">Conexión de WhatsApp</h4>
      <Field label="Modo">
        <select
          className={fieldInputClass}
          value={config.whatsappMode}
          onChange={(e) => setConfig((c) => ({ ...c, whatsappMode: e.target.value as 'web' | 'api' }))}
        >
          <option value="web">WhatsApp Web (sesión personal / Gateway)</option>
          <option value="api">API oficial de WhatsApp (Meta Cloud API)</option>
        </select>
      </Field>

      {config.whatsappMode === 'web' && (
        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 leading-relaxed">
          Se usa la sesión activa de WhatsApp Web (o el Gateway), igual que hoy. No requiere aprobación de Meta.
        </p>
      )}

      {config.whatsappMode === 'api' && (
        <div className="flex flex-col gap-2">
          <PrototypeNotice text="Próximamente: el modo API oficial todavía no se conecta de verdad a Meta." />
          <Field label="Versión de Graph API">
            <input className={fieldInputClass} value={config.cloudApiVersion} onChange={(e) => setConfig((c) => ({ ...c, cloudApiVersion: e.target.value }))} />
          </Field>
          <Field label="Phone Number ID">
            <input className={fieldInputClass} value={config.cloudPhoneNumberId} onChange={(e) => setConfig((c) => ({ ...c, cloudPhoneNumberId: e.target.value }))} />
          </Field>
          <Field label="WABA ID">
            <input className={fieldInputClass} value={config.cloudWabaId} onChange={(e) => setConfig((c) => ({ ...c, cloudWabaId: e.target.value }))} />
          </Field>
          <Field label="App ID">
            <input className={fieldInputClass} value={config.cloudAppId} onChange={(e) => setConfig((c) => ({ ...c, cloudAppId: e.target.value }))} />
          </Field>
          <Field label="Token permanente">
            <input type="password" className={fieldInputClass} value={config.cloudToken} onChange={(e) => setConfig((c) => ({ ...c, cloudToken: e.target.value }))} />
          </Field>
          <Field label="URL del webhook">
            <input className={fieldInputClass} value={config.cloudWebhookUrl} onChange={(e) => setConfig((c) => ({ ...c, cloudWebhookUrl: e.target.value }))} />
          </Field>
          <Field label="Token de verificación del webhook">
            <input className={fieldInputClass} value={config.cloudWebhookVerifyToken} onChange={(e) => setConfig((c) => ({ ...c, cloudWebhookVerifyToken: e.target.value }))} />
          </Field>
          <button
            onClick={testConnection}
            disabled={status === 'loading'}
            className="self-start flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs cursor-pointer transition-all"
          >
            {status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {config.cloudConnectionStatus === 'connected' && status !== 'loading' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            Probar conexión
          </button>
          {config.cloudConnectionStatus === 'connected' && status !== 'loading' && (
            <span className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400">● Conectado</span>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppModeSection;

import React, { useRef, useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import { ApiService } from '@/services/api.service';
import { useAuth } from '@/state/AuthContext';
import { useAppState } from '@/state/AppStateContext';
import { AppConfig } from '@/types/config';
import { ConfigImportSummary } from '@/types/auth';

// Exportar / importar toda la configuración en un archivo .json, para replicar una cuenta en otra
// sin configurar todo de nuevo. Lo del servidor (ajustes del bot y de asesores, asesores, reglas,
// flujo y sus adjuntos, contactos habilitados/Blacklist) lo arma el backend — ver
// ConfigTransferService. Acá se le suma lo que solo vive en este navegador (chrome.storage, ver
// AppStateContext). La Base de Conocimiento NO viaja, a propósito.

// Credenciales y estado de conexión de Meta Cloud API: no se exportan (un token no debería
// terminar en un archivo que se pasa de mano en mano) ni se pisan al importar.
const LOCAL_CONFIG_EXCLUDED: (keyof AppConfig)[] = ['cloudToken', 'cloudWebhookVerifyToken', 'cloudConnectionStatus'];

function describeSummary(s: ConfigImportSummary): string {
  const parts = [
    `${s.settings} ajustes`,
    `${s.advisors} asesor(es)`,
    `${s.keywordRules} regla(s)`,
    s.flow === 'replaced' ? 'flujo reemplazado' : s.flow === 'removed' ? 'flujo vaciado' : 'flujo sin cambios',
    `${s.flowMedia} adjunto(s)`,
    `${s.contacts} contacto(s)`,
  ];
  return parts.join(' · ');
}

export const ConfigTransferSection: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { config, setConfig, templates, setTemplates, tags, setTags, sequences, setSequences, campaignSteps, setCampaignSteps } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [pendingFile, setPendingFile] = useState<{ name: string; payload: any } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const reset = () => {
    setMessage(null);
    setWarnings([]);
    setError(null);
  };

  const handleExport = async () => {
    reset();
    setBusy('export');
    try {
      const serverPart = await ApiService.exportConfig();
      const localConfig: Partial<AppConfig> = { ...config };
      for (const key of LOCAL_CONFIG_EXCLUDED) delete localConfig[key];
      // Apunta a una base de conocimiento por id, y esas no viajan en el archivo.
      localConfig.aiSummaryKnowledgeBaseId = null;

      const payload = { ...serverPart, local: { config: localConfig, templates, tags, sequences, campaignSteps } };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tactica-flow-config-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setMessage('Configuración exportada. Guardá el archivo: es lo que vas a importar en la otra cuenta.');
      if (serverPart.flowMediaSkipped === true) {
        setWarnings(['Los adjuntos del flujo pesan demasiado y no entraron en el archivo: en la otra cuenta hay que volver a subirlos.']);
      }
    } catch (err: any) {
      console.error('[ConfigTransferSection] Error al exportar:', err);
      setError(err?.message || 'No se pudo exportar la configuración.');
    } finally {
      setBusy(null);
    }
  };

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    reset();
    try {
      const payload = JSON.parse(await file.text());
      if (payload?.format !== 'tactica-flow-config') throw new Error('formato');
      setPendingFile({ name: file.name, payload });
    } catch {
      setError('Ese archivo no es una copia de configuración de Táctica Flow.');
    }
  };

  const handleImport = async () => {
    if (!pendingFile) return;
    reset();
    setBusy('import');
    try {
      const { local, ...serverPart } = pendingFile.payload;
      const { summary, user: freshUser } = await ApiService.importConfig(serverPart);

      if (freshUser) updateUser(freshUser);
      setConfig((c) => {
        const importedLocal: Partial<AppConfig> = local?.config && typeof local.config === 'object' ? { ...local.config } : {};
        for (const key of LOCAL_CONFIG_EXCLUDED) delete importedLocal[key];
        const next: AppConfig = { ...c, ...importedLocal, aiSummaryKnowledgeBaseId: null };
        // Los switches que espejan al servidor (ver ChatbotModule.tsx) salen de lo que el servidor
        // terminó guardando, no del archivo: es la fuente de verdad.
        if (!freshUser) return next;
        return {
          ...next,
          botEnabled: freshUser.botEnabled,
          aiFallbackEnabled: freshUser.aiFallbackEnabled,
          botEnabledForNewContacts: freshUser.botEnabledForNewContacts,
          botReplyToAll: freshUser.botReplyToAll,
          botReplyDelayEnabled: freshUser.botReplyDelayEnabled,
          botReplyDelayMinMs: freshUser.botReplyDelayMinMs,
          botReplyDelayMaxMs: freshUser.botReplyDelayMaxMs,
          botMode: freshUser.botMode,
          handoffReservationMinutes: freshUser.handoffReservationMinutes,
          queueReminderSeconds: freshUser.queueReminderSeconds,
          relayInactivityMinutes: freshUser.relayInactivityMinutes,
        };
      });
      if (Array.isArray(local?.templates)) setTemplates(local.templates);
      if (Array.isArray(local?.tags)) setTags(local.tags);
      if (Array.isArray(local?.sequences)) setSequences(local.sequences);
      if (Array.isArray(local?.campaignSteps)) setCampaignSteps(local.campaignSteps);
      // El borrador local del editor de flujos es de la configuración anterior.
      try {
        localStorage.removeItem('tactica_flow_draft');
      } catch {}

      setMessage(`Configuración importada: ${describeSummary(summary)}.`);
      const nextWarnings: string[] = [];
      if (summary.flowMediaSkipped) nextWarnings.push('El archivo no traía los adjuntos del flujo (pesaban demasiado): hay que volver a subirlos en el editor.');
      if (summary.contactsSkipped) nextWarnings.push('No se importaron los contactos habilitados/Blacklist porque WhatsApp no está conectado. Conectalo y volvé a importar.');
      nextWarnings.push('La Base de Conocimiento no viaja en el archivo: cargala aparte.');
      setWarnings(nextWarnings);
      setPendingFile(null);
    } catch (err: any) {
      console.error('[ConfigTransferSection] Error al importar:', err);
      setError(err?.message || 'No se pudo importar la configuración.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xs">
      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100">Copia de configuración</h4>
      <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-snug">
        Exportá toda la configuración a un archivo e importala en otra cuenta para dejarla igual, sin configurar todo de nuevo. Incluye
        ajustes del bot y de la IA, asesores, reglas, flujo con sus adjuntos, contactos habilitados y Blacklist, plantillas y
        etiquetas. No incluye la Base de Conocimiento.
      </p>

      {pendingFile ? (
        <div className="flex flex-col gap-2 border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-2.5">
          <p className="text-[11px] text-slate-800 dark:text-slate-200 leading-snug">
            Vas a importar <span className="font-bold break-all">{pendingFile.name}</span>. Esto <span className="font-bold">reemplaza</span> la
            configuración actual de esta cuenta (asesores, reglas, flujo y ajustes) por la del archivo. No se puede deshacer.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPendingFile(null)}
              disabled={busy !== null}
              className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={busy !== null}
              className="flex items-center justify-center gap-1.5 bg-[#9e1114] hover:bg-[#800d10] disabled:opacity-40 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              {busy === 'import' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Reemplazar todo
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExport}
            disabled={busy !== null}
            className="flex items-center justify-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-800 dark:text-slate-200 font-bold text-xs px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
          >
            {busy === 'export' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Exportar
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy !== null}
            className="flex items-center justify-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-800 dark:text-slate-200 font-bold text-xs px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar
          </button>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFileChosen} className="hidden" />

      {message && <p className="text-[10.5px] text-emerald-700 dark:text-emerald-400 font-semibold leading-snug">{message}</p>}
      {warnings.map((w) => (
        <p key={w} className="text-[10.5px] text-amber-700 dark:text-amber-400 leading-snug">
          {w}
        </p>
      ))}
      {error && <p className="text-[10.5px] text-red-700 dark:text-red-400 font-semibold leading-snug">{error}</p>}
    </div>
  );
};

export default ConfigTransferSection;

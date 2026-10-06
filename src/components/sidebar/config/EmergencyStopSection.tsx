import React, { useState } from 'react';
import { Loader2, OctagonAlert, Power } from 'lucide-react';
import { ApiService } from '@/services/api.service';
import { useAuth } from '@/state/AuthContext';

// Parada de emergencia: corta TODO envío automático de la cuenta (bot, flujos, puente con
// asesores, cola, programados) y limpia lo que quedó a medias — ver EmergencyStopService en el
// backend. Activarla pide confirmación en dos pasos (es un botón que no se quiere tocar sin
// querer); desactivarla es un solo clic.
export const EmergencyStopSection: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  if (!user) return null;
  const active = user.emergencyStop === true;

  const apply = async (next: boolean) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await ApiService.setEmergencyStop(next);
      updateUser({ emergencyStop: res.emergencyStop });
      if (res.cleanup) {
        const { queueCleared, handoffsCleared, flowStatesCleared } = res.cleanup;
        setResult(
          `Se limpiaron ${queueCleared} cliente(s) en cola, ${handoffsCleared} atención(es) o pausa(s) en curso y ${flowStatesCleared} flujo(s) a medias.`
        );
      }
    } catch (err: any) {
      console.error('[EmergencyStopSection] No se pudo cambiar la parada de emergencia:', err);
      setError(err?.message || 'No se pudo cambiar la parada de emergencia.');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div
      className={`border rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xs ${
        active
          ? 'bg-red-50 dark:bg-red-950/40 border-red-400 dark:border-red-800'
          : 'bg-slate-50/90 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
      }`}
    >
      <h4 className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-red-700 dark:text-red-400">
        <OctagonAlert className="w-3.5 h-3.5" /> Parada de emergencia
      </h4>

      {active ? (
        <>
          <p className="text-[11px] font-bold text-red-800 dark:text-red-300 leading-snug">
            ACTIVA — la app no está mandando nada: ni bot, ni flujos, ni puente con asesores, ni cola, ni mensajes programados.
          </p>
          <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-snug">
            WhatsApp sigue conectado y los mensajes que entran se siguen guardando. Al reactivar, el bot vuelve a responder solo a lo
            que llegue desde ese momento.
          </p>
          <button
            onClick={() => apply(false)}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
            Reactivar la app
          </button>
        </>
      ) : confirming ? (
        <>
          <p className="text-[11px] text-slate-800 dark:text-slate-200 leading-snug">
            Se corta al instante todo envío automático y se limpia lo que esté a medias: la cola de espera de asesores, las atenciones
            con asesor en curso, las pausas de IA y los flujos en los que estén los clientes. No se borra configuración, asesores,
            contactos ni historial.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => apply(true)}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs px-3 py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Sí, apagar todo
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-snug">
            Apaga la app de una: deja de responder y de mandar cualquier mensaje automático, y no deja nada pendiente activo.
          </p>
          <button
            onClick={() => setConfirming(true)}
            className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            <OctagonAlert className="w-3.5 h-3.5" />
            Apagar la app
          </button>
        </>
      )}

      {result && <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-snug">{result}</p>}
      {error && <p className="text-[10.5px] text-red-700 dark:text-red-400 font-semibold">{error}</p>}
    </div>
  );
};

export default EmergencyStopSection;

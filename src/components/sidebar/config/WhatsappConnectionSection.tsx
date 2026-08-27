import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/state/AuthContext';
import { useWhatsappStatus } from '@/state/WhatsappStatusContext';
import { ApiService } from '@/services/api.service';
import { WhatsappConnectionStatus } from '@/types/whatsapp';

const STATUS_LABEL: Record<WhatsappConnectionStatus, string> = {
  disconnected: 'Desconectado',
  connecting: 'Conectando...',
  qr_ready: 'Escaneá el código QR',
  connected: 'Conectado',
};

// Conexión REAL a WhatsApp vía Baileys (backend), independiente del motor basado en el DOM que
// usa el resto del panel en web.whatsapp.com. Requiere estar logueado (la sesión es "por
// usuario" del lado del backend). El estado en sí vive en WhatsappStatusContext (compartido con
// el ícono del header real de WhatsApp y la alerta de conexión/desconexión), así que sigue
// actualizándose aunque este panel esté cerrado.
export const WhatsappConnectionSection: React.FC = () => {
  const { user } = useAuth();
  const { status, qr, refresh } = useWhatsappStatus();
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
        Iniciá sesión con Google arriba para conectar tu WhatsApp real.
      </div>
    );
  }

  const handleConnect = async () => {
    setBusy(true);
    try {
      await ApiService.whatsappConnect();
      await refresh();
    } catch (err) {
      console.error('[WhatsappConnectionSection] Error al conectar:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await ApiService.whatsappDisconnect();
      await refresh();
    } catch (err) {
      console.error('[WhatsappConnectionSection] Error al desconectar:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xs">
      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100">WhatsApp (conexión real)</h4>
      <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
        <span className={status === 'connected' ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-800 dark:text-slate-200 font-semibold'}>
          {STATUS_LABEL[status]}
        </span>
        {status === 'connected' ? (
          <button onClick={handleDisconnect} disabled={busy} className="text-xs font-bold text-red-700 dark:text-red-400 hover:underline disabled:opacity-50 cursor-pointer">
            Desconectar
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={busy || status === 'connecting'}
            className="flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-400 hover:underline disabled:opacity-50 cursor-pointer"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Conectar
          </button>
        )}
      </div>

      {qr && (
        <div className="flex flex-col items-center gap-2 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <img src={qr} alt="Código QR de WhatsApp" className="w-44 h-44 rounded-lg shadow-sm" />
          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold text-center">
            WhatsApp → Dispositivos vinculados → Vincular un dispositivo
          </p>
        </div>
      )}

      <p className="text-[10.5px] text-slate-600 dark:text-slate-400 font-medium leading-tight">
        Esta es una sesión de WhatsApp independiente de la extensión (Baileys corre en el
        backend) — no reemplaza el motor de auto-respuesta basado en el DOM de{' '}
        <code className="font-bold text-slate-800 dark:text-slate-200">web.whatsapp.com</code> que usa el resto del panel.
      </p>
    </div>
  );
};

export default WhatsappConnectionSection;

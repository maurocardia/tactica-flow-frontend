import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/state/AuthContext';
import { ApiService } from '@/services/api.service';
import { WhatsappConnectionStatus } from '@/types/whatsapp';

const STATUS_LABEL: Record<WhatsappConnectionStatus, string> = {
  disconnected: 'Desconectado',
  connecting: 'Conectando...',
  qr_ready: 'Escaneá el código QR',
  connected: 'Conectado',
};

const POLL_MS = 3000;

// Conexión REAL a WhatsApp vía Baileys (backend), independiente del motor basado en el DOM que
// usa el resto del panel en web.whatsapp.com. Requiere estar logueado (la sesión es "por
// usuario" del lado del backend).
export const WhatsappConnectionSection: React.FC = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<WhatsappConnectionStatus>('disconnected');
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

  const poll = async () => {
    try {
      const res = await ApiService.whatsappStatus();
      setStatus(res.status);
      if (res.status === 'qr_ready') {
        const qrRes = await ApiService.whatsappQr().catch(() => null);
        if (qrRes) setQr(qrRes.qr);
      } else {
        setQr(null);
      }
    } catch (err) {
      console.error('[WhatsappConnectionSection] Error al consultar el estado:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    poll();
    pollRef.current = window.setInterval(poll, POLL_MS);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return (
      <div className="border border-slate-200 rounded-lg p-2.5 text-[11px] text-slate-500">
        Iniciá sesión con Google arriba para conectar tu WhatsApp real.
      </div>
    );
  }

  const handleConnect = async () => {
    setBusy(true);
    try {
      await ApiService.whatsappConnect();
      await poll();
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
      await poll();
    } catch (err) {
      console.error('[WhatsappConnectionSection] Error al desconectar:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2.5">
      <h4 className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">WhatsApp (conexión real)</h4>
      <div className="flex items-center justify-between text-xs">
        <span className={status === 'connected' ? 'text-emerald-700 font-semibold' : 'text-slate-600'}>
          {STATUS_LABEL[status]}
        </span>
        {status === 'connected' ? (
          <button onClick={handleDisconnect} disabled={busy} className="text-[11px] font-semibold text-red-700 hover:underline disabled:opacity-50">
            Desconectar
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={busy || status === 'connecting'}
            className="flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:underline disabled:opacity-50"
          >
            {busy && <Loader2 className="w-3 h-3 animate-spin" />} Conectar
          </button>
        )}
      </div>

      {qr && (
        <div className="flex flex-col items-center gap-1.5 py-2">
          <img src={qr} alt="Código QR de WhatsApp" className="w-40 h-40" />
          <p className="text-[10.5px] text-slate-500 text-center">
            WhatsApp → Dispositivos vinculados → Vincular un dispositivo
          </p>
        </div>
      )}

      <p className="text-[10px] text-slate-400">
        Esta es una sesión de WhatsApp independiente de la extensión (Baileys corre en el
        backend) — no reemplaza el motor de auto-respuesta basado en el DOM de{' '}
        <code>web.whatsapp.com</code> que usa el resto del panel.
      </p>
    </div>
  );
};

export default WhatsappConnectionSection;

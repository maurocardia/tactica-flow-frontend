import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ApiService } from '@/services/api.service';
import { useAuth } from '@/state/AuthContext';
import { WhatsappConnectionStatus } from '@/types/whatsapp';

const POLL_MS = 3000;

interface WhatsappStatusContextValue {
  status: WhatsappConnectionStatus;
  qr: string | null;
  refresh: () => Promise<void>;
}

const WhatsappStatusContext = createContext<WhatsappStatusContextValue | null>(null);

// Estado compartido de la sesión real de WhatsApp (Baileys) — antes vivía solo adentro de
// WhatsappConnectionSection (Configuración), así que dejaba de actualizarse en cuanto cerrabas
// ese modal. Movido acá para que el ícono del header real de WhatsApp y la alerta de
// conexión/desconexión puedan reflejarlo aunque el modal esté cerrado.
export const WhatsappStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<WhatsappConnectionStatus>('disconnected');
  const [qr, setQr] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const refresh = async () => {
    try {
      const res = await ApiService.whatsappStatus();
      setStatus(res.status);
      if (res.status === 'qr_ready') {
        const qrRes = await ApiService.whatsappQr().catch(() => null);
        setQr(qrRes?.qr ?? null);
      } else {
        setQr(null);
      }
    } catch (err) {
      console.error('[WhatsappStatusContext] Error al consultar el estado:', err);
    }
  };

  useEffect(() => {
    if (!user) {
      setStatus('disconnected');
      setQr(null);
      return;
    }
    refresh();
    pollRef.current = window.setInterval(refresh, POLL_MS);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <WhatsappStatusContext.Provider value={{ status, qr, refresh }}>{children}</WhatsappStatusContext.Provider>
  );
};

export function useWhatsappStatus(): WhatsappStatusContextValue {
  const ctx = useContext(WhatsappStatusContext);
  if (!ctx) throw new Error('useWhatsappStatus debe usarse dentro de <WhatsappStatusProvider>');
  return ctx;
}

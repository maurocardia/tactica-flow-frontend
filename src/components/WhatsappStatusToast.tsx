import React, { useEffect, useRef, useState } from 'react';
import { useWhatsappStatus } from '@/state/WhatsappStatusContext';

const AUTO_HIDE_MS = 4500;

// Alerta flotante (no interactiva) que aparece cuando la sesión real de WhatsApp (Baileys) se
// conecta o se desconecta. Vive dentro del Shadow DOM pero usa `fixed`, así que aparece en la
// esquina de la pantalla real aunque el panel esté visualmente cerrado — igual que los modales
// (ver content/index.tsx). No lleva botón de cerrar a propósito: como el host queda con
// pointer-events:none mientras el panel está cerrado y ningún modal está abierto, un botón acá
// no sería clickeable en ese estado; se auto-oculta sola.
export const WhatsappStatusToast: React.FC = () => {
  const { status } = useWhatsappStatus();
  const prevStatus = useRef<typeof status | null>(null);
  const hideTimeout = useRef<number | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'deb' } | null>(null);

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;

    // No avisar en la primera lectura (recién montado) ni en transiciones intermedias
    // (connecting/qr_ready) — solo cuando efectivamente se logra o se pierde la conexión.
    if (prev === null || prev === status) return;

    if (status === 'connected') {
      setToast({ text: '✅ WhatsApp conectado', tone: 'ok' });
    } else if (status === 'disconnected' && prev === 'connected') {
      setToast({ text: '⚠️ WhatsApp se desconectó', tone: 'deb' });
    } else {
      return;
    }

    if (hideTimeout.current) window.clearTimeout(hideTimeout.current);
    hideTimeout.current = window.setTimeout(() => setToast(null), AUTO_HIDE_MS);
  }, [status]);

  useEffect(() => () => {
    if (hideTimeout.current) window.clearTimeout(hideTimeout.current);
  }, []);

  if (!toast) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 px-3.5 py-2.5 rounded-lg shadow-2xl text-xs font-semibold text-white ${
        toast.tone === 'ok' ? 'bg-emerald-600' : 'bg-red-600'
      }`}
      style={{ zIndex: 2147483647 }}
    >
      {toast.text}
    </div>
  );
};

export default WhatsappStatusToast;

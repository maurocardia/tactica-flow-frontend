import React from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';
import { useAppState } from '@/state/AppStateContext';
import { useModal } from '@/state/ModalContext';
import { useSimulatedAction } from '@/hooks/useSimulatedAction';
import { simulate } from '@/services/simulation.service';

export const LinkedInConnectModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { setAccounts } = useAppState();
  const { payload } = useModal();
  const accountId = (payload as { accountId?: string } | null)?.accountId;
  const { status, run } = useSimulatedAction();

  const detect = () =>
    run(async () => {
      await simulate(undefined);
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, connected: true, linkedinSessionDetected: true } : a))
      );
      setTimeout(onClose, 500);
    });

  return (
    <Modal title="Conectar LinkedIn" onClose={onClose} headerColor="bg-[#0a66c2]">
      <PrototypeNotice text="Próximamente: 'Detectar sesión' todavía no revisa tu LinkedIn real, solo simula la conexión." />
      <p className="text-slate-600">
        Iniciá sesión en LinkedIn en tu navegador y volvé acá. TACTICA detecta la sesión activa, sin pedirte la contraseña.
      </p>
      <a
        href="https://www.linkedin.com/login"
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2 rounded-lg"
      >
        <ExternalLink className="w-3.5 h-3.5" /> Abrir LinkedIn
      </a>
      <button
        onClick={detect}
        disabled={status === 'loading'}
        className="bg-[#0a66c2] hover:opacity-90 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"
      >
        {status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {status === 'done' ? 'Sesión detectada ✓' : 'Detectar mi sesión'}
      </button>
    </Modal>
  );
};

export default LinkedInConnectModal;

import React, { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';
import { useAppState } from '@/state/AppStateContext';
import { useModal } from '@/state/ModalContext';
import { simulate } from '@/services/simulation.service';

const SAMPLE_ACCOUNTS = ['comercial@tacticasoft.com', 'ventas@tacticasoft.com'];

// Simulación visual de un OAuth de Google: selector de cuenta -> pantalla de permisos ->
// "Permitir". No hay ningún flujo real de Google detrás.
export const GoogleOAuthModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { setAccounts } = useAppState();
  const { payload } = useModal();
  const accountId = (payload as { accountId?: string } | null)?.accountId;
  const [step, setStep] = useState<'pick' | 'permissions' | 'loading'>('pick');
  const [selected, setSelected] = useState(SAMPLE_ACCOUNTS[0]);

  const allow = async () => {
    setStep('loading');
    await simulate(undefined);
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, connected: true, name: selected } : a))
    );
    onClose();
  };

  return (
    <Modal title="Conectar con Google" onClose={onClose} headerColor="bg-white text-slate-800 border-b border-slate-100">
      <PrototypeNotice text="Próximamente: esta pantalla simula el inicio de sesión, todavía no hay una cuenta de Google real conectada." />
      {step === 'pick' && (
        <>
          <p className="text-slate-600">Elegí una cuenta</p>
          <div className="flex flex-col gap-2">
            {SAMPLE_ACCOUNTS.map((acc) => (
              <button
                key={acc}
                onClick={() => setSelected(acc)}
                className={`text-left px-3 py-2 rounded-lg border text-xs ${
                  selected === acc ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                {acc}
              </button>
            ))}
          </div>
          <button onClick={() => setStep('permissions')} className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2 rounded-lg">
            Continuar
          </button>
        </>
      )}
      {step === 'permissions' && (
        <>
          <p className="text-slate-600">TACTICA WhatsApp Sync quiere acceder a:</p>
          <ul className="text-[11.5px] text-slate-600 list-disc pl-4 space-y-1">
            <li>Leer y enviar correos en tu nombre</li>
            <li>Ver tu lista de contactos</li>
          </ul>
          <button onClick={allow} className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2 rounded-lg">
            Permitir
          </button>
        </>
      )}
      {step === 'loading' && (
        <div className="flex items-center justify-center gap-2 py-6 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Conectando…
        </div>
      )}
    </Modal>
  );
};

export default GoogleOAuthModal;

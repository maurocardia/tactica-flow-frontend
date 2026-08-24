import React from 'react';
import { Loader2 } from 'lucide-react';
import { ChannelAccount } from '@/types/account';
import { CHANNELS } from '@/config/channels';
import { useAppState } from '@/state/AppStateContext';
import { useModal } from '@/state/ModalContext';
import { useSimulatedAction } from '@/hooks/useSimulatedAction';
import { simulate } from '@/services/simulation.service';

// Botón de conectar/reconectar/desconectar que arma el flujo correcto según el canal
// (oauth -> modal de Google, session-detect -> modal de LinkedIn, resto -> flip directo).
export const ConnectButton: React.FC<{ account: ChannelAccount }> = ({ account }) => {
  const def = CHANNELS[account.channel];
  const { setAccounts } = useAppState();
  const { openModal } = useModal();
  const { status, run } = useSimulatedAction();

  const disconnect = () => setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, connected: false } : a)));

  const connectDirect = () =>
    run(async () => {
      await simulate(undefined);
      setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, connected: true } : a)));
    });

  if (account.connected) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="acc-state text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">● Conectado</span>
        <button onClick={disconnect} className="border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10.5px] font-semibold rounded-md px-2 py-1">
          Desconectar
        </button>
      </div>
    );
  }

  if (def.connectFlow === 'oauth' && account.channel === 'gm') {
    return (
      <button
        onClick={() => openModal('google-oauth', { accountId: account.id })}
        className="bg-red-600 hover:bg-red-700 text-white text-[10.5px] font-semibold rounded-md px-2.5 py-1"
      >
        Conectar con Google
      </button>
    );
  }

  if (def.connectFlow === 'session-detect') {
    return (
      <button
        onClick={() => openModal('linkedin-connect', { accountId: account.id })}
        className="bg-[#0a66c2] hover:opacity-90 text-white text-[10.5px] font-semibold rounded-md px-2.5 py-1"
      >
        Abrir LinkedIn e iniciar sesión
      </button>
    );
  }

  return (
    <button
      onClick={connectDirect}
      disabled={status === 'loading'}
      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[10.5px] font-semibold rounded-md px-2.5 py-1 flex items-center gap-1"
    >
      {status === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
      Conectar con {def.label}
    </button>
  );
};

export default ConnectButton;

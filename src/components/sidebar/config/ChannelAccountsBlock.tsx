import React from 'react';
import { Plus } from 'lucide-react';
import { ChannelDefinition } from '@/config/channels';
import { useAppState } from '@/state/AppStateContext';
import { AccountRow } from './AccountRow';

export const ChannelAccountsBlock: React.FC<{ channel: ChannelDefinition }> = ({ channel }) => {
  const { accounts, setAccounts } = useAppState();
  const channelAccounts = accounts.filter((a) => a.channel === channel.id);

  const addAccount = () =>
    setAccounts((prev) => [
      ...prev,
      {
        id: `acc-${channel.id}-${Date.now()}`,
        channel: channel.id,
        name: '',
        connected: false,
        dailyLimit: channel.defaultDailyLimit,
        ...(channel.id === 'wa' ? { waMode: 'web' as const } : {}),
      },
    ]);

  return (
    <div className="border border-slate-200 rounded-lg p-2.5">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${channel.color}`}>{channel.shortLabel}</span>
        <span className="font-bold text-[12px] text-slate-700">{channel.label}</span>
        <button
          onClick={addAccount}
          className="ml-auto flex items-center gap-1 text-[10.5px] font-semibold text-red-700 border border-slate-200 rounded-md px-2 py-1 hover:bg-red-50"
        >
          <Plus className="w-3 h-3" /> Agregar
        </button>
      </div>
      <div className="flex flex-col gap-2 mt-2">
        {channelAccounts.length === 0 && <p className="text-[11px] text-slate-400 py-1">Sin cuentas cargadas.</p>}
        {channelAccounts.map((acc) => (
          <AccountRow key={acc.id} account={acc} />
        ))}
      </div>
    </div>
  );
};

export default ChannelAccountsBlock;

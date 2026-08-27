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
    <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xs">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-extrabold rounded-full px-2.5 py-0.5 shadow-2xs ${channel.color}`}>{channel.shortLabel}</span>
        <span className="font-extrabold text-[12.5px] text-slate-900 dark:text-slate-100 tracking-tight">{channel.label}</span>
        <button
          onClick={addAccount}
          className="ml-auto flex items-center gap-1 text-[11px] font-bold text-red-700 dark:text-red-400 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar
        </button>
      </div>
      <div className="flex flex-col gap-2 mt-1">
        {channelAccounts.length === 0 && <p className="text-xs text-slate-600 dark:text-slate-400 font-medium py-1">Sin cuentas cargadas.</p>}
        {channelAccounts.map((acc) => (
          <AccountRow key={acc.id} account={acc} />
        ))}
      </div>
    </div>
  );
};

export default ChannelAccountsBlock;

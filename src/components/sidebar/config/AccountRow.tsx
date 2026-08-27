import React from 'react';
import { Trash2 } from 'lucide-react';
import { ChannelAccount } from '@/types/account';
import { CHANNELS } from '@/config/channels';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { ComingSoonField } from '@/components/ui/ComingSoonField';
import { ConnectButton } from '../connections/ConnectButton';
import { useAppState } from '@/state/AppStateContext';

export const AccountRow: React.FC<{ account: ChannelAccount }> = ({ account }) => {
  const def = CHANNELS[account.channel];
  const { setAccounts } = useAppState();

  const update = (patch: Partial<ChannelAccount>) =>
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, ...patch } : a)));

  const remove = () => setAccounts((prev) => prev.filter((a) => a.id !== account.id));

  return (
    <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 bg-white dark:bg-slate-800/80 flex flex-col gap-2.5 shadow-2xs">
      <div className="flex items-center gap-2">
        <input
          className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 [color-scheme:light] font-semibold focus:outline-none focus:border-red-500"
          value={account.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder={`Nombre de la cuenta de ${def.label}`}
        />
        <button onClick={remove} className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 shrink-0 transition-colors cursor-pointer" title="Eliminar cuenta">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {account.channel === 'wa' && (
        <div className="flex flex-col gap-2">
          <select
            className={fieldInputClass}
            value={account.waMode ?? 'web'}
            onChange={(e) => update({ waMode: e.target.value as 'web' | 'api' })}
          >
            <option value="web">Web</option>
            <option value="api">Cloud API</option>
          </select>
          {account.waMode === 'api' && (
            <>
              <input className={fieldInputClass} placeholder="Phone Number ID" value={account.phoneNumberId ?? ''} onChange={(e) => update({ phoneNumberId: e.target.value })} />
              <input className={fieldInputClass} placeholder="WABA ID" value={account.wabaId ?? ''} onChange={(e) => update({ wabaId: e.target.value })} />
              <input type="password" className={fieldInputClass} placeholder="Token" value={account.token ?? ''} onChange={(e) => update({ token: e.target.value })} />
            </>
          )}
        </div>
      )}

      {account.channel === 'li' && (
        <div className="flex flex-col gap-2">
          <ConnectButton account={account} />
          <div className="flex gap-2">
            <Field label="Invit./día">
              <input
                type="number"
                className={fieldInputClass}
                value={account.invitesPerDay ?? 0}
                onChange={(e) => update({ invitesPerDay: Number(e.target.value) })}
              />
            </Field>
          </div>
          <ComingSoonField label="IP / proxy" />
        </div>
      )}

      {account.channel !== 'wa' && account.channel !== 'li' && <ConnectButton account={account} />}

      <Field label={def.dailyLimitLabel}>
        <input
          type="number"
          className={fieldInputClass}
          value={account.dailyLimit}
          onChange={(e) => update({ dailyLimit: Number(e.target.value) })}
        />
      </Field>
    </div>
  );
};

export default AccountRow;

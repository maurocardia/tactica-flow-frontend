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
    <div className="border border-slate-100 rounded-lg p-2 bg-slate-50/60 flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <input
          className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-xs bg-white text-slate-800 [color-scheme:light]"
          value={account.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder={`Nombre de la cuenta de ${def.label}`}
        />
        <button onClick={remove} className="border border-slate-200 bg-white rounded-md p-1 text-slate-400 hover:text-red-600 shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {account.channel === 'wa' && (
        <div className="flex flex-col gap-1.5">
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
        <div className="flex flex-col gap-1.5">
          <ConnectButton account={account} />
          <div className="flex gap-1.5">
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

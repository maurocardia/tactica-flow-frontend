import React from 'react';
import { CHANNEL_LIST } from '@/config/channels';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';
import { ChannelAccountsBlock } from './ChannelAccountsBlock';

export const AccountsSection: React.FC = () => (
  <div className="flex flex-col gap-2.5">
    <h4 className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Cuentas y canales</h4>
    <PrototypeNotice text="Próximamente: conectar una cuenta acá (salvo WhatsApp) todavía no la vincula de verdad." />
    {CHANNEL_LIST.map((channel) => (
      <ChannelAccountsBlock key={channel.id} channel={channel} />
    ))}
  </div>
);

export default AccountsSection;

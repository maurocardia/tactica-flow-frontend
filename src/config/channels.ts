import { ChannelId } from '@/types/account';

export type ConnectFlow = 'oauth' | 'session-detect' | 'form';

export interface ChannelDefinition {
  id: ChannelId;
  label: string;
  shortLabel: string;
  color: string; // clases tailwind bg/text para chips
  connectFlow: ConnectFlow;
  defaultDailyLimit: number;
  dailyLimitLabel: string;
  supportsCampaigns: boolean;
  supportsIncomingLeads: boolean;
}

// Registro único de canales: agregar un canal nuevo = una entrada acá, no componentes nuevos.
export const CHANNELS: Record<ChannelId, ChannelDefinition> = {
  wa: {
    id: 'wa',
    label: 'WhatsApp',
    shortLabel: 'WA',
    color: 'bg-emerald-50 text-emerald-700',
    connectFlow: 'form',
    defaultDailyLimit: 40,
    dailyLimitLabel: 'Límite/día',
    supportsCampaigns: true,
    supportsIncomingLeads: false,
  },
  li: {
    id: 'li',
    label: 'LinkedIn',
    shortLabel: 'LI',
    color: 'bg-blue-50 text-blue-700',
    connectFlow: 'session-detect',
    defaultDailyLimit: 25,
    dailyLimitLabel: 'Msg/día',
    supportsCampaigns: true,
    supportsIncomingLeads: false,
  },
  gm: {
    id: 'gm',
    label: 'Gmail',
    shortLabel: 'GM',
    color: 'bg-red-50 text-red-700',
    connectFlow: 'oauth',
    defaultDailyLimit: 80,
    dailyLimitLabel: 'Envíos/día',
    supportsCampaigns: true,
    supportsIncomingLeads: false,
  },
  fb: {
    id: 'fb',
    label: 'Facebook',
    shortLabel: 'FB',
    color: 'bg-indigo-50 text-indigo-700',
    connectFlow: 'oauth',
    defaultDailyLimit: 60,
    dailyLimitLabel: 'Resp./día',
    supportsCampaigns: false,
    supportsIncomingLeads: true,
  },
  ig: {
    id: 'ig',
    label: 'Instagram',
    shortLabel: 'IG',
    color: 'bg-pink-50 text-pink-700',
    connectFlow: 'oauth',
    defaultDailyLimit: 60,
    dailyLimitLabel: 'Resp./día',
    supportsCampaigns: false,
    supportsIncomingLeads: true,
  },
  tt: {
    id: 'tt',
    label: 'TikTok',
    shortLabel: 'TT',
    color: 'bg-slate-100 text-slate-800',
    connectFlow: 'oauth',
    defaultDailyLimit: 60,
    dailyLimitLabel: 'Resp./día',
    supportsCampaigns: false,
    supportsIncomingLeads: true,
  },
  ml: {
    id: 'ml',
    label: 'Mercado Libre',
    shortLabel: 'ML',
    color: 'bg-yellow-50 text-yellow-800',
    connectFlow: 'oauth',
    defaultDailyLimit: 60,
    dailyLimitLabel: 'Preguntas/día',
    supportsCampaigns: false,
    supportsIncomingLeads: true,
  },
};

export const CHANNEL_LIST: ChannelDefinition[] = Object.values(CHANNELS);
export const CAMPAIGN_CHANNELS: ChannelDefinition[] = CHANNEL_LIST.filter((c) => c.supportsCampaigns);
export const INCOMING_LEAD_CHANNELS: ChannelDefinition[] = CHANNEL_LIST.filter((c) => c.supportsIncomingLeads);

import { ChannelId } from './account';

export type FallbackMode = 'otro' | 'saltar' | 'omitir' | 'esperar';
export type StepKind = 'fijo' | 'ia';

export interface CampaignStep {
  id: string;
  channel: ChannelId;
  delayLabel: string;
  kind: StepKind;
  text: string;
  useChatContext: boolean;
  fallbackMode: FallbackMode;
  fallbackChannel?: ChannelId;
}

export interface CollectedLead {
  id: string;
  name: string;
  company?: string;
  channels: ChannelId[];
  source: string;
}

export type LeadSourceId =
  | 'linkedin-search'
  | 'linkedin-network'
  | 'sales-navigator'
  | 'google-contacts'
  | 'whatsapp-groups'
  | 'csv'
  | 'tactica';

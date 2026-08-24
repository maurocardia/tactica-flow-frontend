import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppConfig } from '@/types/config';
import { ChannelAccount } from '@/types/account';
import { MessageTemplate } from '@/types/template';
import { CampaignStep, CollectedLead } from '@/types/campaign';
import { ScheduledMessage, Sequence } from '@/types/scheduled';
import {
  INITIAL_CONFIG,
  INITIAL_ACCOUNTS,
  INITIAL_TEMPLATES,
  INITIAL_CAMPAIGN_STEPS,
  INITIAL_LEADS,
  INITIAL_SCHEDULED_MESSAGES,
  INITIAL_SEQUENCES,
  INITIAL_TAGS,
} from './initialData';
import { loadPersistedState, savePersistedState } from './persistence';

interface PersistedShape {
  config: AppConfig;
  accounts: ChannelAccount[];
  templates: MessageTemplate[];
  campaignSteps: CampaignStep[];
  leads: CollectedLead[];
  scheduledMessages: ScheduledMessage[];
  sequences: Sequence[];
  tags: string[];
}

interface AppStateValue {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  accounts: ChannelAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<ChannelAccount[]>>;
  templates: MessageTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<MessageTemplate[]>>;
  campaignSteps: CampaignStep[];
  setCampaignSteps: React.Dispatch<React.SetStateAction<CampaignStep[]>>;
  leads: CollectedLead[];
  setLeads: React.Dispatch<React.SetStateAction<CollectedLead[]>>;
  scheduledMessages: ScheduledMessage[];
  setScheduledMessages: React.Dispatch<React.SetStateAction<ScheduledMessage[]>>;
  sequences: Sequence[];
  setSequences: React.Dispatch<React.SetStateAction<Sequence[]>>;
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);
  const [accounts, setAccounts] = useState<ChannelAccount[]>(INITIAL_ACCOUNTS);
  const [templates, setTemplates] = useState<MessageTemplate[]>(INITIAL_TEMPLATES);
  const [campaignSteps, setCampaignSteps] = useState<CampaignStep[]>(INITIAL_CAMPAIGN_STEPS);
  const [leads, setLeads] = useState<CollectedLead[]>(INITIAL_LEADS);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>(INITIAL_SCHEDULED_MESSAGES);
  const [sequences, setSequences] = useState<Sequence[]>(INITIAL_SEQUENCES);
  const [tags, setTags] = useState<string[]>(INITIAL_TAGS);

  const hydrated = useRef(false);

  // Hidratar una sola vez desde chrome.storage.local al montar.
  useEffect(() => {
    loadPersistedState<PersistedShape>().then((saved) => {
      if (saved) {
        if (saved.config) setConfig(saved.config);
        if (saved.accounts) setAccounts(saved.accounts);
        if (saved.templates) setTemplates(saved.templates);
        if (saved.campaignSteps) setCampaignSteps(saved.campaignSteps);
        if (saved.leads) setLeads(saved.leads);
        if (saved.scheduledMessages) setScheduledMessages(saved.scheduledMessages);
        if (saved.sequences) setSequences(saved.sequences);
        if (saved.tags) setTags(saved.tags);
      }
      hydrated.current = true;
    });
  }, []);

  // Guardar con debounce cada vez que cambia algo, una vez hidratado (evita pisar lo guardado
  // con los valores iniciales antes de que termine de cargar).
  useEffect(() => {
    if (!hydrated.current) return;
    const timeout = setTimeout(() => {
      savePersistedState<PersistedShape>({
        config,
        accounts,
        templates,
        campaignSteps,
        leads,
        scheduledMessages,
        sequences,
        tags,
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [config, accounts, templates, campaignSteps, leads, scheduledMessages, sequences, tags]);

  const value: AppStateValue = {
    config, setConfig,
    accounts, setAccounts,
    templates, setTemplates,
    campaignSteps, setCampaignSteps,
    leads, setLeads,
    scheduledMessages, setScheduledMessages,
    sequences, setSequences,
    tags, setTags,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState debe usarse dentro de <AppStateProvider>');
  return ctx;
}

import React from 'react';
import { useModal } from '@/state/ModalContext';
import { useActiveChat } from '@/hooks/useActiveChat';
import { PlaceholderModal } from './PlaceholderModal';
import { DialerModal } from './quick/DialerModal';
import { ReassignModal } from './quick/ReassignModal';
import { GoToRecordModal } from './quick/GoToRecordModal';
import { GenerateDocumentModal } from './quick/GenerateDocumentModal';
import { SaveHistoryModal } from './quick/SaveHistoryModal';
import { QuickTaskModal } from './quick/QuickTaskModal';
import { ScheduleActivityModal } from './quick/ScheduleActivityModal';
import { TagGroupModal } from './quick/TagGroupModal';
import { ScheduleMessageModal } from './quick/ScheduleMessageModal';
import { ConfigModal } from './config/ConfigModal';
import { KnowledgeBaseModal } from './knowledge/KnowledgeBaseModal';
import { TemplatesModal } from './templates/TemplatesModal';
import { CampaignsModal } from './campaigns/CampaignsModal';
import { ScheduledModal } from './scheduled/ScheduledModal';
import { IncomingLeadsModal } from './leads/IncomingLeadsModal';
import { GoogleOAuthModal } from './connections/GoogleOAuthModal';
import { LinkedInConnectModal } from './connections/LinkedInConnectModal';
import { AiSummaryModal } from './ai/AiSummaryModal';
import { AiSummaryConfigModal } from './ai/AiSummaryConfigModal';
import { AiAgentConfigModal } from './ai/AiAgentConfigModal';

// Único punto que decide qué modal está montado. Nunca hay más de uno a la vez.
export const ModalHost: React.FC = () => {
  const { activeModal, closeModal } = useModal();
  const { activeContact } = useActiveChat();

  if (!activeModal) return null;

  switch (activeModal) {
    case 'dialer':
      return <DialerModal onClose={closeModal} />;
    case 'reassign':
      return <ReassignModal onClose={closeModal} />;
    case 'go-to-record':
      return <GoToRecordModal onClose={closeModal} />;
    case 'generate-document':
      return <GenerateDocumentModal onClose={closeModal} />;
    case 'save-history':
      return <SaveHistoryModal onClose={closeModal} />;
    case 'quick-task':
      return <QuickTaskModal onClose={closeModal} />;
    case 'schedule-activity':
      return <ScheduleActivityModal onClose={closeModal} />;
    case 'tag-group':
      return <TagGroupModal onClose={closeModal} />;
    case 'schedule-message':
      return <ScheduleMessageModal onClose={closeModal} contactName={activeContact} />;
    case 'ai-summary':
      return <AiSummaryModal onClose={closeModal} contactName={activeContact} />;
    case 'ai-summary-config':
      return <AiSummaryConfigModal onClose={closeModal} />;
    case 'ai-agent-config':
      return <AiAgentConfigModal onClose={closeModal} />;
    case 'config':
      return <ConfigModal onClose={closeModal} />;
    case 'knowledge-base':
      return <KnowledgeBaseModal onClose={closeModal} />;
    case 'templates':
      return <TemplatesModal onClose={closeModal} />;
    case 'campaigns':
      return <CampaignsModal onClose={closeModal} />;
    case 'scheduled':
      return <ScheduledModal onClose={closeModal} contactName={activeContact} />;
    case 'incoming-leads':
      return <IncomingLeadsModal onClose={closeModal} />;
    case 'google-oauth':
      return <GoogleOAuthModal onClose={closeModal} />;
    case 'linkedin-connect':
      return <LinkedInConnectModal onClose={closeModal} />;
    case 'sequence-editor':
      return <PlaceholderModal title="Editor de secuencia" onClose={closeModal} />;
    default:
      return <PlaceholderModal title="Próximamente" onClose={closeModal} />;
  }
};

export default ModalHost;

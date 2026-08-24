import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { AccountSection } from './AccountSection';
import { WhatsappConnectionSection } from './WhatsappConnectionSection';
import { WhatsAppModeSection } from './WhatsAppModeSection';
import { AiEngineSection } from './AiEngineSection';
import { BehaviorSection } from './BehaviorSection';
import { VisibilitySection } from './VisibilitySection';
import { AccountsSection } from './AccountsSection';

export const ConfigModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Modal title="Configuración" onClose={onClose} maxWidth="max-w-[480px]" footer={
    <button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2 rounded-lg">
      Listo
    </button>
  }>
    <AccountSection />
    <WhatsappConnectionSection />
    <WhatsAppModeSection />
    <AiEngineSection />
    <BehaviorSection />
    <VisibilitySection />
    <AccountsSection />
  </Modal>
);

export default ConfigModal;

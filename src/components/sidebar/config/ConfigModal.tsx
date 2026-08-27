import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { AccountSection } from './AccountSection';
import { WhatsappConnectionSection } from './WhatsappConnectionSection';
import { WhatsAppModeSection } from './WhatsAppModeSection';
import { AiEngineSection } from './AiEngineSection';
import { BehaviorSection } from './BehaviorSection';
import { VisibilitySection } from './VisibilitySection';
import { AccountsSection } from './AccountsSection';
import { ThemeSection } from './ThemeSection';

export const ConfigModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Modal title="Configuración" onClose={onClose} maxWidth="max-w-[480px]" footer={
    <button onClick={onClose} className="bg-[#9e1114] hover:bg-[#800d10] text-white font-bold text-xs px-5 py-2 rounded-xl shadow-xs cursor-pointer transition-all">
      Listo
    </button>
  }>
    <ThemeSection />
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

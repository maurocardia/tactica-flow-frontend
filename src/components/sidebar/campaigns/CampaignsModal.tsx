import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';
import { SourcesTab } from './SourcesTab';
import { CampaignTab } from './CampaignTab';

type CampTab = 'fuentes' | 'campana';

export const CampaignsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [tab, setTab] = useState<CampTab>('fuentes');

  return (
    <Modal title="Campañas y fuentes de contactos" onClose={onClose} maxWidth="max-w-[480px]">
      <PrototypeNotice text="Próximamente: las fuentes de leads y el envío de campañas todavía no se conectan a LinkedIn, Gmail ni WhatsApp de verdad." />
      <Tabs
        tabs={[
          { id: 'fuentes', label: 'Fuentes de contactos' },
          { id: 'campana', label: 'Campaña multicanal' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'fuentes' ? <SourcesTab /> : <CampaignTab />}
    </Modal>
  );
};

export default CampaignsModal;

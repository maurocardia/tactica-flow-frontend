// src/components/Sidebar.tsx
import React from 'react';
import Header from './sidebar/Header';
import ContactCard from './sidebar/ContactCard';
import { AiModule } from './sidebar/AiModule';
import { SelectMessagesCard } from './sidebar/SelectMessagesCard';
import Ficha360 from './sidebar/Ficha360';
import ChatbotModule from './sidebar/ChatbotModule';
import ToolsGrid from './sidebar/ToolsGrid';
import { ModalHost } from './sidebar/ModalHost';
import { ExternalBridge } from './ExternalBridge';
import { WhatsappStatusToast } from './WhatsappStatusToast';
import { useActiveChat } from '@/hooks/useActiveChat';
import { useAppState } from '@/state/AppStateContext';

export const Sidebar: React.FC = () => {
    const { activeContact } = useActiveChat();
    const { config } = useAppState();
    const visible = config.moduleVisibility;

    return (
        <aside className="w-full h-full bg-slate-100/90 backdrop-blur-md border-l border-slate-200/80 flex flex-col items-stretch overflow-y-auto font-sans">
            {/* Header rojo moderno ocupando el 100% */}
            <Header />

            {/* Contenedor del cuerpo con tarjetas redondeadas a 20px y efecto glass */}
            <div className="w-full p-3 flex flex-col gap-3.5 box-border">
                {visible.contactCard && <ContactCard contactName={activeContact} />}
                {visible.aiModule && <AiModule />}
                {visible.chatbot && <ChatbotModule />}
                {visible.selectMessages && <SelectMessagesCard />}
                {visible.ficha360 && <Ficha360 />}
                {visible.toolsGrid && <ToolsGrid />}
            </div>

            <ModalHost />
            <ExternalBridge />
            <WhatsappStatusToast />
        </aside>
    );
};


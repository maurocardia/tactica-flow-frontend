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
    const isDark = config.theme === 'dark';

    return (
        <div className="w-full h-full relative overflow-hidden">
            {/* Panel lateral deslizante anclado a la derecha */}
            <aside className={`absolute top-0 right-0 w-[360px] h-full ${isDark ? 'dark bg-[#090d16] text-slate-100' : 'bg-slate-100/90 text-slate-900'} backdrop-blur-md border-l border-slate-200/80 flex flex-col items-stretch overflow-hidden font-sans transition-colors z-10 shadow-lg`}>
                {/* Header rojo moderno ocupando el 100% */}
                <Header />

                {/* Contenedor del cuerpo con scroll independiente */}
                <div className="flex-1 w-full p-3 flex flex-col gap-3.5 box-border overflow-y-auto">
                    {visible.contactCard && <ContactCard contactName={activeContact} />}
                    {visible.aiModule && <AiModule />}
                    {visible.chatbot && <ChatbotModule />}
                    {visible.selectMessages && <SelectMessagesCard />}
                    {visible.ficha360 && <Ficha360 />}
                    {visible.toolsGrid && <ToolsGrid />}
                </div>
            </aside>

            {/* Modales y Overlays globales a pantalla completa centrados */}
            <ModalHost />
            <ExternalBridge />
            <WhatsappStatusToast />
        </div>
    );
};



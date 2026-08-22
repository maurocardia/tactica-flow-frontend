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
import { useActiveChat } from '@/hooks/useActiveChat';
import { useAppState } from '@/state/AppStateContext';

export const Sidebar: React.FC = () => {
    const { activeContact } = useActiveChat();
    const { config } = useAppState();
    const visible = config.moduleVisibility;

    return (
        // Usa w-full e items-stretch para obligar a todo a pegarse a los bordes
        <aside className="w-full h-full bg-slate-100 border-l border-slate-200 flex flex-col items-stretch overflow-y-auto font-sans">
            {/* Header rojo ocupando el 100% */}
            <Header />

            {/* Contenedor del cuerpo con ancho completo. Orden: Contacto → IA → Seleccionar
                mensajes → Ficha 360 → Chatbot → Herramientas (igual al mockup del cliente). */}
            <div className="w-full p-3 flex flex-col gap-3 box-border">
                {visible.contactCard && <ContactCard contactName={activeContact} />}
                {visible.aiModule && <AiModule />}
                {visible.selectMessages && <SelectMessagesCard />}
                {visible.ficha360 && <Ficha360 />}
                {visible.chatbot && <ChatbotModule />}
                {visible.toolsGrid && <ToolsGrid />}
            </div>

            <ModalHost />
            <ExternalBridge />
        </aside>
    );
};

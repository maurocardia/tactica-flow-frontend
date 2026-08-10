// src/components/Sidebar.tsx
import React from 'react';
import Header from './sidebar/Header';
import ContactCard from './sidebar/ContactCard';
import { AiModule } from './sidebar/AiModule';
import { SelectMessagesCard } from './sidebar/SelectMessagesCard';
import { BotRulesCard } from './sidebar/BotRulesCard';
import Ficha360 from './sidebar/Ficha360';
import ChatbotModule from './sidebar/ChatbotModule';
import ToolsGrid from './sidebar/ToolsGrid';
import { useActiveChat } from '@/hooks/useActiveChat';

export const Sidebar: React.FC = () => {
    const { activeContact } = useActiveChat();

    return (
        // Usa w-full e items-stretch para obligar a todo a pegarse a los bordes
        <aside className="w-full h-full bg-slate-100 border-l border-slate-200 flex flex-col items-stretch overflow-y-auto font-sans">
            {/* Header rojo ocupando el 100% */}
            <Header />

            {/* Contenedor del cuerpo con ancho completo */}
            <div className="w-full p-3 flex flex-col gap-3 box-border">
                <ContactCard contactName={activeContact} />
                <ChatbotModule />
                <AiModule />
                <SelectMessagesCard />
                <BotRulesCard />
                <Ficha360 />

                <ToolsGrid />
            </div>
        </aside>
    );
};
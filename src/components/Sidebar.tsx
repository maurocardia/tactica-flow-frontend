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
import { useWhatsappStatus } from '@/state/WhatsappStatusContext';
import { useModal } from '@/state/ModalContext';
import { QrCode, WifiOff, Loader2 } from 'lucide-react';

export const Sidebar: React.FC = () => {
    const { activeContact } = useActiveChat();
    const { config } = useAppState();
    const { status } = useWhatsappStatus();
    const { openModal } = useModal();
    const visible = config.moduleVisibility;
    const isDark = config.theme === 'dark';
    const isConnected = status === 'connected';

    return (
        <div className="w-full h-full relative overflow-hidden">
            {/* Panel lateral deslizante anclado a la derecha */}
            <aside className={`absolute top-0 right-0 w-[360px] h-full ${isDark ? 'dark bg-[#090d16] text-slate-100' : 'bg-slate-100/90 text-slate-900'} backdrop-blur-md border-l border-slate-200/80 flex flex-col items-stretch overflow-hidden font-sans transition-colors z-10 shadow-lg`}>
                {/* Header rojo moderno ocupando el 100% */}
                <Header />

                {/* Contenedor del cuerpo con scroll independiente */}
                <div className="flex-1 w-full p-3 flex flex-col gap-3.5 box-border overflow-y-auto relative">
                    {!isConnected && (
                        <div className="sticky top-0 z-20 w-full p-3.5 bg-amber-500/15 dark:bg-amber-950/40 border border-amber-500/30 rounded-xl backdrop-blur-md flex flex-col gap-2 text-center shadow-lg transition-all animate-in fade-in duration-300">
                            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                                {status === 'connecting' ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                ) : (
                                    <WifiOff className="w-4 h-4 text-amber-500" />
                                )}
                                <span>
                                    {status === 'connecting'
                                        ? 'Conectando con WhatsApp...'
                                        : status === 'qr_ready'
                                        ? 'Código QR pendiente de escaneo'
                                        : 'WhatsApp Desconectado'}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                {status === 'qr_ready'
                                    ? 'Hay un código QR listo. Escanéalo desde tu celular para habilitar las funciones del panel.'
                                    : 'Las funciones de IA, Ficha 360 y Chatbot quedan bloqueadas hasta que vincules tu sesión de WhatsApp.'}
                            </p>
                            <button
                                onClick={() => openModal('config')}
                                className="w-full py-2 px-3 bg-gradient-to-r from-[#9e1114] to-[#b81519] text-white font-semibold text-xs rounded-lg shadow-sm hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <QrCode className="w-4 h-4" />
                                <span>{status === 'qr_ready' ? 'Ver Código QR' : 'Vincular WhatsApp'}</span>
                            </button>
                        </div>
                    )}

                    <div className={`flex flex-col gap-3.5 transition-all duration-300 ${!isConnected ? 'opacity-35 grayscale pointer-events-none select-none filter' : ''}`}>
                        {visible.contactCard && <ContactCard contactName={activeContact} />}
                        {visible.aiModule && <AiModule />}
                        {visible.chatbot && <ChatbotModule />}
                        {visible.selectMessages && <SelectMessagesCard />}
                        {visible.ficha360 && <Ficha360 />}
                        {visible.toolsGrid && <ToolsGrid />}
                    </div>
                </div>
            </aside>

            {/* Modales y Overlays globales a pantalla completa centrados */}
            <ModalHost />
            <ExternalBridge />
            <WhatsappStatusToast />
        </div>
    );
};



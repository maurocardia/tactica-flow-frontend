// src/components/sidebar/AiModule.tsx
import React, { useState } from 'react';
import { ApiService } from '@/services/api.service';
import { useAppState } from '@/state/AppStateContext';
import { useModal } from '@/state/ModalContext';
import {
    Mic,
    MessageSquare,
    Send,
    Bot,
    User,
    ArrowLeft,
    Loader2
} from 'lucide-react';

interface Message {
    text: string;
    sender: 'user' | 'bot';
    source?: string;
}

interface AiModuleProps {
    conversationId?: string | number | null;
}

export const AiModule: React.FC<AiModuleProps> = ({ conversationId }) => {
    const { config } = useAppState();
    const { openModal } = useModal();
    // Estado para alternar entre el Menú Rápido y el Chat de Redacción
    const [viewMode, setViewMode] = useState<'menu' | 'chat'>('menu');

    // Estado de mensajes e inputs
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<Message[]>([
        { text: '¡Hola! Soy tu asistente de Táctica Flow. ¿En qué puedo ayudarte?', sender: 'bot' }
    ]);

    // Enviar mensaje al bot
    const handleSend = async (customMessage?: string) => {
        const textToSend = customMessage || input.trim();
        if (!textToSend || loading) return;

        if (!customMessage) setInput('');
        setChatHistory((prev) => [...prev, { text: textToSend, sender: 'user' }]);
        setLoading(true);

        try {
            if (conversationId) {
                const response: any = await ApiService.sendMessage(conversationId, textToSend, 'customer');
                const botMsg = response.messages?.find((m: any) => m.sender === 'agent' || m.sender === 'bot');
                if (botMsg) {
                    setChatHistory((prev) => [...prev, { text: botMsg.text, sender: 'bot' }]);
                }
            } else {
                const response: any = await ApiService.testBotReply(textToSend);
                setChatHistory((prev) => [
                    ...prev,
                    { text: response.replyText, sender: 'bot', source: response.source }
                ]);
            }
        } catch (error) {
            console.error('[AiModule] Error al enviar mensaje:', error);
            setChatHistory((prev) => [
                ...prev,
                { text: '⚠️ Hubo un error de conexión con el bot.', sender: 'bot' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    // VISTA 1: Menú de Acciones Rápidas (Estilo exacto de tu maqueta)
    if (viewMode === 'menu') {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-2.5">
                {/* Cabecera del módulo */}
                <div className="flex items-center justify-between text-xs font-bold tracking-wide uppercase">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block shrink-0"></span>
                        <span className="text-indigo-950">INTELIGENCIA ARTIFICIAL</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 lowercase first-letter:uppercase">
                        {config.aiProvider}
                    </span>
                </div>

                {/* Grid de botones superiores */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => openModal('ai-summary')}
                        className="flex items-center justify-center gap-1.5 bg-purple-50/70 hover:bg-purple-100/80 text-purple-700 font-medium text-xs py-2.5 px-2 rounded-lg border border-purple-100 transition-colors"
                    >
                        <MessageSquare className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Resumir charla</span>
                    </button>

                    <button
                        onClick={() => {
                            setViewMode('chat');
                            handleSend('Transcribir audios del chat');
                        }}
                        className="flex items-center justify-between bg-purple-50/70 hover:bg-purple-100/80 text-purple-700 font-medium text-xs py-2.5 px-2 rounded-lg border border-purple-100 transition-colors"
                    >
                        <div className="flex items-center gap-1.5">
                            <Mic className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>Transcribir audios</span>
                        </div>
                        <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
                            3
                        </span>
                    </button>
                </div>
            </div>
        );
    }

    // VISTA 2: Chat del Asistente / Redacción con Botón Atrás
    return (
        <div className="flex flex-col h-[340px] bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            {/* Header del Chat con Botón Atrás */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs font-semibold text-slate-800">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode('menu')}
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
                        title="Volver a funciones"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <Bot className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Asistente Táctica Flow</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">En vivo</span>
            </div>

            {/* Historial de conversación */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                {chatHistory.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex gap-1.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.sender === 'bot' && <Bot className="w-3.5 h-3.5 text-emerald-600 mt-1 shrink-0" />}
                        <div
                            className={`px-3 py-2 rounded-xl max-w-[88%] text-xs leading-relaxed ${msg.sender === 'user'
                                ? 'bg-emerald-600 text-white rounded-br-none'
                                : 'bg-slate-100 text-slate-700 rounded-bl-none'
                                }`}
                        >
                            <p>{msg.text}</p>
                            {msg.source && (
                                <span className="text-[9px] opacity-60 block mt-1">
                                    {msg.source}
                                </span>
                            )}
                        </div>
                        {msg.sender === 'user' && <User className="w-3.5 h-3.5 text-slate-400 mt-1 shrink-0" />}
                    </div>
                ))}
                {loading && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span>Consultando al bot...</span>
                    </div>
                )}
            </div>

            {/* Input de envío */}
            <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 transition-all"
                />
                <button
                    onClick={() => handleSend()}
                    disabled={loading}
                    className="px-2.5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                    <Send className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};
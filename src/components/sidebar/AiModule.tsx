// src/components/sidebar/AiModule.tsx
import React from 'react';
import { useAppState } from '@/state/AppStateContext';
import { useModal } from '@/state/ModalContext';
import { Mic, MessageSquare, Sparkles } from 'lucide-react';

export const AiModule: React.FC = () => {
    const { config } = useAppState();
    const { openModal } = useModal();

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

            {/* Grid de botones de IA */}
            <div className="grid grid-cols-3 gap-1.5">
                <button
                    onClick={() => openModal('ai-summary')}
                    className="flex flex-col items-center justify-center gap-1 bg-purple-50/70 hover:bg-purple-100/80 text-purple-800 font-semibold text-[11px] py-2 px-1 rounded-lg border border-purple-100 transition-colors text-center"
                    title="Generar resumen ejecutivo de la conversación"
                >
                    <MessageSquare className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Resumir</span>
                </button>

                <button
                    onClick={() => openModal('ai-draft')}
                    className="flex flex-col items-center justify-center gap-1 bg-purple-50/70 hover:bg-purple-100/80 text-purple-800 font-semibold text-[11px] py-2 px-1 rounded-lg border border-purple-100 transition-colors text-center"
                    title="Redactar respuesta inteligente con tono y contexto"
                >
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Redactar</span>
                </button>

                <button
                    onClick={() => openModal('ai-transcribe')}
                    className="flex flex-col items-center justify-center gap-1 bg-purple-50/70 hover:bg-purple-100/80 text-purple-800 font-semibold text-[11px] py-2 px-1 rounded-lg border border-purple-100 transition-colors text-center"
                    title="Transcribir notas de voz del chat"
                >
                    <Mic className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Audios</span>
                </button>
            </div>
        </div>
    );
};

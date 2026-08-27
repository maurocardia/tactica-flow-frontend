// src/components/sidebar/AiModule.tsx
import React from 'react';
import { useAppState } from '@/state/AppStateContext';
import { useModal } from '@/state/ModalContext';
import { Mic, MessageSquare, Sparkles } from 'lucide-react';

export const AiModule: React.FC = () => {
    const { config } = useAppState();
    const { openModal } = useModal();

    return (
        <div className="bg-gradient-to-br from-white/95 to-purple-50/40 backdrop-blur-md border border-purple-100/90 rounded-[20px] p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3">
            {/* Cabecera del módulo */}
            <div className="flex items-center justify-between text-[11px] font-bold tracking-wider uppercase">
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block shrink-0 shadow-xs"></span>
                    <span className="text-slate-900">INTELIGENCIA ARTIFICIAL</span>
                </div>
                <span className="text-[10.5px] font-bold text-purple-700 bg-purple-100/70 border border-purple-200 px-2 py-0.5 rounded-full lowercase first-letter:uppercase">
                    {config.aiProvider}
                </span>
            </div>

            {/* Grid de botones de IA */}
            <div className="grid grid-cols-3 gap-2">
                <button
                    onClick={() => openModal('ai-summary')}
                    className="flex flex-col items-center justify-center gap-1.5 bg-white/90 hover:bg-purple-100/80 text-purple-950 font-bold text-[11px] py-2.5 px-1 rounded-2xl border border-purple-200/70 transition-all text-center shadow-2xs hover:scale-[1.02] cursor-pointer"
                    title="Generar resumen ejecutivo de la conversación"
                >
                    <div className="w-7 h-7 rounded-xl bg-purple-100/90 flex items-center justify-center text-purple-700">
                        <MessageSquare className="w-4 h-4" />
                    </div>
                    <span>Resumir</span>
                </button>

                <button
                    onClick={() => openModal('ai-draft')}
                    className="flex flex-col items-center justify-center gap-1.5 bg-white/90 hover:bg-purple-100/80 text-purple-950 font-bold text-[11px] py-2.5 px-1 rounded-2xl border border-purple-200/70 transition-all text-center shadow-2xs hover:scale-[1.02] cursor-pointer"
                    title="Redactar respuesta inteligente con tono y contexto"
                >
                    <div className="w-7 h-7 rounded-xl bg-purple-100/90 flex items-center justify-center text-purple-700">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <span>Redactar</span>
                </button>

                <button
                    onClick={() => openModal('ai-transcribe')}
                    className="flex flex-col items-center justify-center gap-1.5 bg-white/90 hover:bg-purple-100/80 text-purple-950 font-bold text-[11px] py-2.5 px-1 rounded-2xl border border-purple-200/70 transition-all text-center shadow-2xs hover:scale-[1.02] cursor-pointer"
                    title="Transcribir notas de voz del chat"
                >
                    <div className="w-7 h-7 rounded-xl bg-purple-100/90 flex items-center justify-center text-purple-700">
                        <Mic className="w-4 h-4" />
                    </div>
                    <span>Audios</span>
                </button>
            </div>
        </div>
    );
};

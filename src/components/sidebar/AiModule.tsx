// src/components/sidebar/AiModule.tsx
import React from 'react';
import { useAppState } from '@/state/AppStateContext';
import { useModal } from '@/state/ModalContext';
import { Mic, MessageSquare, Sparkles, Settings } from 'lucide-react';

export const AiModule: React.FC = () => {
    const { config } = useAppState();
    const { openModal } = useModal();

    return (
        <div className="glass-card glass-card-hover p-3.5 flex flex-col gap-3">
            {/* Cabecera del módulo */}
            <div className="flex items-center justify-between text-[11px] font-bold tracking-wider uppercase">
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block shrink-0 shadow-xs"></span>
                    <span className="text-slate-900 dark:text-slate-100 font-extrabold">INTELIGENCIA ARTIFICIAL</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => openModal('ai-summary-config')}
                        title="Configurar Resumen IA"
                        className="p-1 text-purple-700 dark:text-purple-300 hover:bg-purple-100/70 dark:hover:bg-purple-950/80 rounded-lg transition-colors cursor-pointer"
                    >
                        <Settings className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10.5px] font-bold text-purple-800 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800/80 px-2.5 py-0.5 rounded-full lowercase first-letter:uppercase backdrop-blur-xs">
                        {config.aiProvider}
                    </span>
                </div>
            </div>

            {/* Grid de botones de IA */}
            <div className="grid grid-cols-3 gap-2">
                <button
                    onClick={() => openModal('ai-summary')}
                    className="flex flex-col items-center justify-center gap-1.5 glass-pill hover:bg-purple-50/90 dark:hover:bg-slate-800 text-purple-950 dark:text-purple-200 font-bold text-[11px] py-2.5 px-1 rounded-2xl border border-purple-200/70 dark:border-purple-900/60 transition-all text-center shadow-2xs hover:scale-[1.03] cursor-pointer"
                    title="Generar resumen ejecutivo de la conversación"
                >
                    <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center text-purple-700 dark:text-purple-300 shadow-2xs">
                        <MessageSquare className="w-4 h-4" />
                    </div>
                    <span>Resumir</span>
                </button>

                <button
                    onClick={() => openModal('ai-draft')}
                    className="flex flex-col items-center justify-center gap-1.5 glass-pill hover:bg-purple-50/90 dark:hover:bg-slate-800 text-purple-950 dark:text-purple-200 font-bold text-[11px] py-2.5 px-1 rounded-2xl border border-purple-200/70 dark:border-purple-900/60 transition-all text-center shadow-2xs hover:scale-[1.03] cursor-pointer"
                    title="Redactar respuesta inteligente con tono y contexto"
                >
                    <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center text-purple-700 dark:text-purple-300 shadow-2xs">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <span>Redactar</span>
                </button>

                <button
                    onClick={() => openModal('ai-transcribe')}
                    className="flex flex-col items-center justify-center gap-1.5 glass-pill hover:bg-purple-50/90 dark:hover:bg-slate-800 text-purple-950 dark:text-purple-200 font-bold text-[11px] py-2.5 px-1 rounded-2xl border border-purple-200/70 dark:border-purple-900/60 transition-all text-center shadow-2xs hover:scale-[1.03] cursor-pointer"
                    title="Transcribir notas de voz del chat"
                >
                    <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center text-purple-700 dark:text-purple-300 shadow-2xs">
                        <Mic className="w-4 h-4" />
                    </div>
                    <span>Audios</span>
                </button>
            </div>
        </div>
    );
};

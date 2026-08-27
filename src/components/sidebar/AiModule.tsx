// src/components/sidebar/AiModule.tsx
import React from 'react';
import { useAppState } from '@/state/AppStateContext';
import { useModal } from '@/state/ModalContext';
import { Mic, MessageSquare, Settings } from 'lucide-react';

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

            {/* Grid de botones */}
            <div className="grid grid-cols-2 gap-2">
                <div className="flex gap-0">
                    <button
                        onClick={() => openModal('ai-summary')}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-purple-50/70 hover:bg-purple-100/80 text-purple-700 font-medium text-xs py-2.5 px-2 rounded-l-lg border border-purple-100 transition-colors"
                    >
                        <MessageSquare className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Resumir charla</span>
                    </button>
                    <button
                        onClick={() => openModal('ai-summary-config')}
                        title="Configurar Resumen IA"
                        className="flex items-center justify-center bg-purple-50/70 hover:bg-purple-100/80 text-purple-700 px-2 rounded-r-lg border border-l-0 border-purple-100 transition-colors"
                    >
                        <Settings className="w-3.5 h-3.5 shrink-0" />
                    </button>
                </div>

                <button
                    disabled
                    title="Próximamente"
                    className="flex items-center justify-center gap-1.5 bg-slate-100 text-slate-400 font-medium text-xs py-2.5 px-2 rounded-lg border border-slate-200 cursor-not-allowed"
                >
                    <Mic className="w-3.5 h-3.5 shrink-0" />
                    <span>Transcribir audios (próximamente)</span>
                </button>
            </div>
        </div>
    );
};

import React, { useEffect, useState } from 'react';
import { CheckSquare, X, Bookmark, Calendar, UserCheck, Copy, Check } from 'lucide-react';
import { DOMService } from '@/services/dom.service';
import { useModal } from '@/state/ModalContext';

export const SelectMessagesCard: React.FC = () => {
    const { openModal } = useModal();
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState<{ id: string; text: string; sender: 'me' | 'them' }[]>([]);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isSelecting) return;

        const cleanup = DOMService.enableMessageSelectionMode((msgs) => {
            setSelectedMessages(msgs);
        });

        return () => {
            cleanup();
        };
    }, [isSelecting]);

    const handleCopy = () => {
        const text = selectedMessages
            .map((m) => `${m.sender === 'them' ? 'Cliente' : 'Asesor'}: ${m.text}`)
            .join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveHistory = () => {
        openModal('save-history');
    };

    const handleScheduleActivity = () => {
        openModal('schedule-activity');
    };

    const handleReassign = () => {
        openModal('reassign');
    };

    if (!isSelecting) {
        return (
            <button
                type="button"
                onClick={() => setIsSelecting(true)}
                className="w-full glass-card glass-card-hover text-slate-900 font-extrabold text-xs py-3 px-3.5 flex items-center justify-center gap-2.5 cursor-pointer"
            >
                <div className="w-6 h-6 rounded-lg bg-red-500/15 text-[#9e1114] flex items-center justify-center shadow-2xs">
                    <CheckSquare className="w-4 h-4" />
                </div>
                <span>Seleccionar mensajes del chat</span>
            </button>
        );
    }

    return (
        <div className="w-full glass-card p-3.5 flex flex-col gap-3 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-extrabold text-[#9e1114] text-xs">
                    <CheckSquare className="w-4 h-4" />
                    <span>{selectedMessages.length} mensaje(s) seleccionado(s)</span>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setIsSelecting(false);
                        setSelectedMessages([]);
                    }}
                    className="p-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                    title="Salir del modo selección"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <p className="text-[11px] text-slate-700 font-semibold leading-relaxed">
                Tilda los mensajes que deseas incluir para realizar acciones masivas.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                    type="button"
                    onClick={handleSaveHistory}
                    disabled={selectedMessages.length === 0}
                    className="flex items-center justify-center gap-1.5 glass-pill hover:bg-white disabled:opacity-40 text-slate-900 font-bold text-[11px] py-2 px-2 rounded-xl transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
                >
                    <Bookmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Historial</span>
                </button>

                <button
                    type="button"
                    onClick={handleScheduleActivity}
                    disabled={selectedMessages.length === 0}
                    className="flex items-center justify-center gap-1.5 glass-pill hover:bg-white disabled:opacity-40 text-slate-900 font-bold text-[11px] py-2 px-2 rounded-xl transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
                >
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Actividad</span>
                </button>

                <button
                    type="button"
                    onClick={handleReassign}
                    disabled={selectedMessages.length === 0}
                    className="flex items-center justify-center gap-1.5 glass-pill hover:bg-white disabled:opacity-40 text-slate-900 font-bold text-[11px] py-2 px-2 rounded-xl transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
                >
                    <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Reasignar</span>
                </button>

                <button
                    type="button"
                    onClick={handleCopy}
                    disabled={selectedMessages.length === 0}
                    className="flex items-center justify-center gap-1.5 glass-pill hover:bg-white disabled:opacity-40 text-slate-900 font-bold text-[11px] py-2 px-2 rounded-xl transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-700" />}
                    <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                </button>
            </div>
        </div>
    );
};

export default SelectMessagesCard;
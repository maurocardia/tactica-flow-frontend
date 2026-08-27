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
                className="w-full bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs py-2.5 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
                <CheckSquare className="w-4 h-4 text-[#9e1114]" />
                <span>Seleccionar mensajes del chat</span>
            </button>
        );
    }

    return (
        <div className="w-full bg-[#9e1114]/5 border border-[#9e1114]/20 rounded-xl p-3 flex flex-col gap-2.5 shadow-sm text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#9e1114]">
                    <CheckSquare className="w-4 h-4" />
                    <span>{selectedMessages.length} mensaje(s) seleccionado(s)</span>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setIsSelecting(false);
                        setSelectedMessages([]);
                    }}
                    className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-200/50"
                    title="Salir del modo selección"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <p className="text-[11px] text-slate-500">
                Tilda los mensajes que deseas incluir para realizar acciones masivas.
            </p>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                    type="button"
                    onClick={handleSaveHistory}
                    disabled={selectedMessages.length === 0}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold text-[11px] py-1.5 px-2 rounded-lg border border-slate-200 shadow-2xs"
                >
                    <Bookmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Guardar historial</span>
                </button>

                <button
                    type="button"
                    onClick={handleScheduleActivity}
                    disabled={selectedMessages.length === 0}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold text-[11px] py-1.5 px-2 rounded-lg border border-slate-200 shadow-2xs"
                >
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Actividad</span>
                </button>

                <button
                    type="button"
                    onClick={handleReassign}
                    disabled={selectedMessages.length === 0}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold text-[11px] py-1.5 px-2 rounded-lg border border-slate-200 shadow-2xs"
                >
                    <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Reasignar</span>
                </button>

                <button
                    type="button"
                    onClick={handleCopy}
                    disabled={selectedMessages.length === 0}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-semibold text-[11px] py-1.5 px-2 rounded-lg border border-slate-200 shadow-2xs"
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                    <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                </button>
            </div>
        </div>
    );
};

export default SelectMessagesCard;
import React, { useState } from 'react';
import {
    Phone, ArrowUpRight, UserPlus, Receipt,
    Zap, FolderDown, CalendarClock, CalendarCheck,
    Repeat, Tags, Megaphone, Inbox, Shuffle
} from 'lucide-react';
import { ModalId } from '@/config/modals';
import { useModal } from '@/state/ModalContext';
import { useReorder } from '@/hooks/useReorder';

interface Tool {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    modal: ModalId;
}

const INITIAL_TOOLS: Tool[] = [
    { id: 'marcador', label: 'Marcador', icon: Phone, modal: 'dialer' },
    { id: 'ir-a', label: 'Ir a', icon: ArrowUpRight, modal: 'go-to-record' },
    { id: 'reasignar', label: 'Reasignar', icon: UserPlus, modal: 'reassign' },
    { id: 'comprobante', label: 'Comprobante', icon: Receipt, modal: 'generate-document' },
    { id: 'plantillas', label: 'Plantillas', icon: Zap, modal: 'templates' },
    { id: 'guardar-historial', label: 'Guardar historial', icon: FolderDown, modal: 'save-history' },
    { id: 'prog-mensaje', label: 'Prog. mensaje', icon: CalendarClock, modal: 'schedule-message' },
    { id: 'prog-actividad', label: 'Prog. actividad', icon: CalendarCheck, modal: 'schedule-activity' },
    { id: 'secuencias', label: 'Secuencias', icon: Repeat, modal: 'scheduled' },
    { id: 'etiquetar-grupo', label: 'Etiquetar grupo', icon: Tags, modal: 'tag-group' },
    { id: 'campanas', label: 'Campañas', icon: Megaphone, modal: 'campaigns' },
    { id: 'leads-entrantes', label: 'Leads entrantes', icon: Inbox, modal: 'incoming-leads' },
];

export default function ToolsGrid() {
    const [tools, setTools] = useState<Tool[]>(INITIAL_TOOLS);
    const { openModal } = useModal();
    const { reordering, draggedIndex, toggleReordering, startDrag, enterDrag, endDrag } = useReorder(tools, setTools);

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    🧰 Herramientas
                </span>
                <button
                    onClick={toggleReordering}
                    className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border ${
                        reordering ? 'bg-red-600 text-white border-red-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <Shuffle className="w-3 h-3" /> {reordering ? 'Listo' : 'Reordenar'}
                </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] font-semibold text-slate-700">
                {tools.map((tool, index) => {
                    const Icon = tool.icon;
                    return (
                        <button
                            key={tool.id}
                            onPointerDown={() => startDrag(index)}
                            onPointerEnter={() => enterDrag(index)}
                            onPointerUp={endDrag}
                            onClick={() => !reordering && openModal(tool.modal)}
                            className={`flex flex-col items-center gap-1 p-2 border rounded-lg transition ${
                                reordering
                                    ? `border-dashed cursor-move ${draggedIndex === index ? 'opacity-40 border-red-500' : 'border-red-300'}`
                                    : 'border-slate-200 hover:bg-red-50 hover:border-red-200'
                            }`}
                        >
                            <Icon className="w-4 h-4 text-slate-600" /> {tool.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

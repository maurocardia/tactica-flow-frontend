import {
    Phone, ArrowUpRight, UserPlus, Receipt,
    Zap, FolderDown, CalendarClock, CalendarCheck,
    Repeat, Tags, Megaphone, Inbox, Shuffle, Wrench
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
        <div className="glass-card glass-card-hover p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-red-500/15 dark:bg-red-950/80 text-[#9e1114] dark:text-red-400 flex items-center justify-center shadow-2xs">
                        <Wrench className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">HERRAMIENTAS</span>
                </div>
                <button
                    onClick={toggleReordering}
                    className={`flex items-center gap-1 text-[10.5px] font-extrabold px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                        reordering ? 'bg-[#9e1114] text-white border-[#9e1114] shadow-xs' : 'glass-pill text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700'
                    }`}
                >
                    <Shuffle className="w-3 h-3" /> {reordering ? 'Listo' : 'Reordenar'}
                </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] font-extrabold text-slate-900 dark:text-slate-100">
                {tools.map((tool, index) => {
                    const Icon = tool.icon;
                    return (
                        <button
                            key={tool.id}
                            onPointerDown={() => startDrag(index)}
                            onPointerEnter={() => enterDrag(index)}
                            onPointerUp={endDrag}
                            onClick={() => !reordering && openModal(tool.modal)}
                            className={`flex flex-col items-center justify-center gap-1.5 p-2.5 border rounded-2xl transition-all cursor-pointer shadow-2xs ${
                                reordering
                                    ? `border-dashed cursor-move ${draggedIndex === index ? 'opacity-40 border-red-500 bg-red-50 dark:bg-red-950/60' : 'border-red-300 bg-white dark:bg-slate-800'}`
                                    : 'glass-pill hover:bg-white dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 hover:border-red-300 dark:hover:border-red-800 hover:scale-[1.03]'
                            }`}
                        >
                            <div className="w-7 h-7 rounded-xl bg-red-500/15 dark:bg-red-950/80 flex items-center justify-center text-[#9e1114] dark:text-red-400 shadow-2xs">
                                <Icon className="w-4 h-4" />
                            </div>
                            <span className="truncate w-full leading-tight">{tool.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

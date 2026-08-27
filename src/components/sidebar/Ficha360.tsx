// src/components/sidebar/Ficha360Card.tsx
import React, { useState } from 'react';
import {
    User,
    Search,
    ChevronRight,
    ChevronLeft,
    MessageSquare,
    PhoneOutgoing,
    Mail
} from 'lucide-react';
import { useAppState } from '@/state/AppStateContext';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';

interface HistoryItem {
    id: string;
    type: 'charla' | 'llamada' | 'email';
    title: string;
    date: string;
    details: string;
    author: string;
}

type Ficha360Tab = 'historial' | 'pendientes' | 'presupuestos' | 'facturacion' | 'compras' | 'ctacte';

const TAB_LABELS: Record<Ficha360Tab, string> = {
    historial: 'Historial',
    pendientes: 'Pendientes',
    presupuestos: 'Presupuestos',
    facturacion: 'Facturación',
    compras: 'Compras',
    ctacte: 'Cta. corriente',
};

const Ficha360: React.FC = () => {
    const { config } = useAppState();
    const visibleTabs = (Object.keys(config.ficha360Tabs) as Ficha360Tab[]).filter((k) => config.ficha360Tabs[k]);
    const [activeTab, setActiveTab] = useState<Ficha360Tab>(visibleTabs[0] ?? 'historial');
    const [filterText, setFilterText] = useState('');
    const [filterType, setFilterType] = useState('todos');

    const historyItems: HistoryItem[] = [

    ];

    if (visibleTabs.length > 0 && !visibleTabs.includes(activeTab)) {
        setActiveTab(visibleTabs[0]);
    }

    return (
        <div className="glass-card glass-card-hover p-3.5 flex flex-col gap-3">
            {/* Header Ficha 360 */}
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                <div className="w-6 h-6 rounded-lg bg-red-500/15 dark:bg-red-950/80 text-[#9e1114] dark:text-red-400 flex items-center justify-center shadow-2xs">
                    <User className="w-3.5 h-3.5" />
                </div>
                <span className="font-extrabold text-slate-900 dark:text-slate-100">FICHA 360° · TACTICA</span>
            </div>

            <PrototypeNotice text="Próximamente: todavía no trae datos reales de Táctica ERP." />

            {/* Tabs / Pestañas de Navegación */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                {visibleTabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all shrink-0 cursor-pointer ${
                            activeTab === tab
                                ? 'bg-[#9e1114] text-white shadow-xs'
                                : 'glass-pill hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                    >
                        {TAB_LABELS[tab]}
                    </button>
                ))}
            </div>

            {/* Filtro de búsqueda y Selector */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Filtrar..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 [color-scheme:light]"
                    />
                </div>

                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none [color-scheme:light]"
                >
                    <option value="todos">Todos</option>
                    <option value="charla">Charlas</option>
                    <option value="llamada">Llamadas</option>
                    <option value="email">Emails</option>
                </select>
            </div>

            {/* Lista de Registros del Historial */}
            <div className="flex flex-col divide-y divide-slate-100 mt-1">
                {historyItems.map((item) => (
                    <div
                        key={item.id}
                        className="py-2.5 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors cursor-pointer"
                    >
                        <div className="flex items-start gap-2">
                            {item.type === 'charla' && <MessageSquare className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />}
                            {item.type === 'llamada' && <PhoneOutgoing className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />}
                            {item.type === 'email' && <Mail className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />}

                            <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-xs leading-tight">
                                    {item.title}
                                </span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    {item.date} · {item.details} · <User className="w-2.5 h-2.5 inline" /> {item.author}
                                </span>
                            </div>
                        </div>

                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
};
export default Ficha360;
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
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-2.5">
            {/* Header Ficha 360 */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <User className="w-4 h-4 text-purple-700" />
                <span>FICHA 360° · TACTICA</span>
            </div>

            <PrototypeNotice text="Próximamente: todavía no trae datos reales de Táctica ERP." />

            {/* Tabs / Pestañas de Navegación con Scroll (visibilidad configurable desde Config) */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
                {visibleTabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shrink-0 ${activeTab === tab
                            ? 'bg-red-900 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                    >
                        {TAB_LABELS[tab]}
                    </button>
                ))}
            </div>

            {/* Barra de desplazamiento indicadora */}
            <div className="flex items-center justify-between text-slate-400 px-1">
                <ChevronLeft className="w-3.5 h-3.5 cursor-pointer hover:text-slate-600" />
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full mx-2 overflow-hidden">
                    <div className="w-1/3 h-full bg-slate-500 rounded-full"></div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 cursor-pointer hover:text-slate-600" />
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
                        className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                    />
                </div>

                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-medium focus:outline-none"
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
                        className="py-2 flex items-center justify-between hover:bg-slate-50 px-1 rounded-lg transition-colors cursor-pointer"
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
import React, { useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';

export default function Ficha360() {
    const [activeTab, setActiveTab] = useState<string>('historial');
    const [filterText, setFilterText] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('Todos');

    const tabs = ["historial", "pendientes", "presupuestos", "facturacion", "compras", "ctacte"];

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                👤 Ficha 360° · TACTICA
            </div>

            {/* Tabs Header */}
            <div className="flex gap-1 overflow-x-auto pb-1.5 border-b border-slate-100 scrollbar-none">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize whitespace-nowrap transition ${activeTab === tab
                                ? "bg-[#9e1114] text-white"
                                : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
                            }`}
                    >
                        {tab === "ctacte" ? "Cta. Cte." : tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-2 text-xs">
                {activeTab === "historial" && (
                    <div className="space-y-2">
                        <div className="flex gap-1.5">
                            <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filtrar..."
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="w-full pl-7 pr-2 py-1 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-red-400"
                                />
                            </div>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="border border-slate-200 rounded-md px-1.5 text-xs text-slate-600 focus:outline-none"
                            >
                                <option>Todos</option>
                                <option>Charla</option>
                                <option>Llamada</option>
                                <option>Email</option>
                            </select>
                        </div>

                        <div className="divide-y divide-slate-100">
                            <div className="py-2 flex items-center justify-between hover:bg-red-50/50 p-1 rounded cursor-pointer transition">
                                <div>
                                    <div className="font-semibold text-slate-800">💬 Charla — Presupuesto licencias</div>
                                    <div className="text-[11px] text-slate-500">12/07 · 6 mensajes · 👤 H. López</div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="py-2 flex items-center justify-between hover:bg-red-50/50 p-1 rounded cursor-pointer transition">
                                <div>
                                    <div className="font-semibold text-slate-800">📞 Llamada saliente</div>
                                    <div className="text-[11px] text-slate-500">10/07 · 8 min · 👤 M. Fernández</div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab !== "historial" && (
                    <div className="py-4 text-center text-slate-400 italic">
                        Sin registros activos en {activeTab}.
                    </div>
                )}
            </div>
        </div>
    );
}
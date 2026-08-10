import React from 'react';
import {
    Phone, ArrowUpRight, UserPlus, Receipt,
    Zap, FolderDown, Calendar, Pin, Repeat
} from 'lucide-react';

export default function ToolsGrid() {
    const tools = [
        { label: 'Marcador', icon: Phone },
        { label: 'Ir a', icon: ArrowUpRight },
        { label: 'Reasignar', icon: UserPlus },
        { label: 'Comprobante', icon: Receipt },
        { label: 'Plantillas', icon: Zap },
        { label: 'Historial', icon: FolderDown },
        { label: 'Prog. mensaje', icon: Calendar },
        { label: 'Prog. actividad', icon: Pin },
        { label: 'Secuencias', icon: Repeat },
    ];

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                🧰 Herramientas
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] font-semibold text-slate-700">
                {tools.map((tool, index) => {
                    const Icon = tool.icon;
                    return (
                        <button
                            key={index}
                            className="flex flex-col items-center gap-1 p-2 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition"
                        >
                            <Icon className="w-4 h-4 text-slate-600" /> {tool.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}



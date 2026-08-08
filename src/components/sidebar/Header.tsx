import React from 'react';
import { RefreshCw, Settings } from 'lucide-react';

interface HeaderProps {
    onRefresh: () => void;
}

export default function Header({ onRefresh }: HeaderProps) {
    return (
        <div className="bg-[#9e1114] text-white p-3 flex items-start justify-between shadow-sm">
            <div>
                <div className="flex items-center gap-2 font-bold text-[14.5px]">
                    <div className="w-7 h-7 rounded-full bg-white text-[#9e1114] flex items-center justify-center font-black text-xs">
                        T
                    </div>
                    TACTICA · WA Sync
                </div>
                <div className="flex items-center gap-1.5 text-[11px] mt-1 text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Conectado
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                    H. López · Tacticasoft S.A.
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={onRefresh}
                    className="text-white hover:opacity-80 transition p-1"
                    title="Actualizar chat"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
                <button
                    className="text-white hover:opacity-80 transition p-1"
                    title="Configuración"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
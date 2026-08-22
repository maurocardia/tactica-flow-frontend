import React from 'react';
import { Check } from 'lucide-react';

export const SelectMessagesCard: React.FC = () => {
    return (
        <button
            disabled
            title="Próximamente"
            className="w-full bg-slate-100 text-red-900/50 font-bold text-xs py-2.5 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-2 shadow-sm cursor-not-allowed"
        >
            <Check className="w-4 h-4 text-purple-700/50 stroke-[3]" />
            <span>Seleccionar mensajes (próximamente)</span>
        </button>
    );
};
import React from 'react';
import { Check } from 'lucide-react';

export const SelectMessagesCard: React.FC = () => {
    return (
        <button
            onClick={() => console.log('Seleccionar mensajes')}
            className="w-full bg-slate-100 hover:bg-slate-200/80 text-red-900 font-bold text-xs py-2.5 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
            <Check className="w-4 h-4 text-purple-700 stroke-[3]" />
            <span>Seleccionar mensajes</span>
        </button>
    );
};
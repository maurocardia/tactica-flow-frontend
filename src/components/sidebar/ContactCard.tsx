import React from 'react';
import { User, Bot, Clock, Repeat } from 'lucide-react';

interface ContactCardProps {
    contactName: string;
}

export default function ContactCard({ contactName }: ContactCardProps) {
    const isSelected = contactName !== 'Sin chat seleccionado';

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-semibold text-xs shrink-0">
                    <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 truncate">
                        {contactName}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                        {isSelected ? 'Cliente Activo' : 'Ningún chat detectado'}
                    </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-[#e8181e] font-semibold border border-red-100 shrink-0">
                    Vinculado
                </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800">
                    <Bot className="w-3 h-3" /> Autoatención activa
                </span>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-md bg-red-50 border border-red-200 text-[#9e1114] cursor-pointer hover:bg-red-100">
                    <Clock className="w-3 h-3" /> 1 programado
                </span>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 cursor-pointer">
                    <Repeat className="w-3 h-3" /> Secuencia 2/4
                </span>
            </div>
        </div>
    );
}
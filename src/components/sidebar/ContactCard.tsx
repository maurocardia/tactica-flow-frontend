import React from 'react';
import { User } from 'lucide-react';

interface ContactCardProps {
    contactName: string;
}

const ContactCard: React.FC<ContactCardProps> = ({ contactName }) => {
    const isSelected = contactName !== 'Sin chat seleccionado';

    return (
        <div className="glass-card glass-card-hover p-3.5">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500/15 to-red-600/10 text-[#9e1114] dark:text-red-400 border border-red-200/50 dark:border-red-900/60 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate tracking-tight">
                        {contactName}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                        <span>{isSelected ? 'Cliente Activo' : 'Ningún chat detectado'}</span>
                    </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-500/10 dark:bg-red-950/60 text-[#9e1114] dark:text-red-300 font-bold border border-red-200/60 dark:border-red-800/80 shrink-0 shadow-2xs backdrop-blur-xs">
                    Vinculado
                </span>
            </div>
        </div>
    );
};
export default ContactCard;

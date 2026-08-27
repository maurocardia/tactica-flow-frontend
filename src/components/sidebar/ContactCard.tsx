import React from 'react';
import { User } from 'lucide-react';

interface ContactCardProps {
    contactName: string;
}

const ContactCard: React.FC<ContactCardProps> = ({ contactName }) => {
    const isSelected = contactName !== 'Sin chat seleccionado';

    return (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-[20px] p-3.5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 text-[#9e1114] border border-red-200/60 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate tracking-tight">
                        {contactName}
                    </div>
                    <div className="text-xs text-slate-500 font-medium truncate flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                        <span>{isSelected ? 'Cliente Activo' : 'Ningún chat detectado'}</span>
                    </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-50 text-[#9e1114] font-bold border border-red-200/70 shrink-0 shadow-2xs">
                    Vinculado
                </span>
            </div>
        </div>
    );
};
export default ContactCard;

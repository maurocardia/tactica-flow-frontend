import React from 'react';
import { MessageSquare, Save } from 'lucide-react';

interface NotesCardProps {
    note: string;
    setNote: (note: string) => void;
    onSave: () => void;
    isSaved: boolean;
    disabled: boolean;
}

export default function NotesCard({ note, setNote, onSave, isSaved, disabled }: NotesCardProps) {
    return (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-[20px] p-3.5 shadow-sm hover:shadow-md transition-all space-y-2.5">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-red-50 text-[#9e1114] flex items-center justify-center">
                        <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <span>NOTAS DEL CLIENTE</span>
                </span>
                {isSaved && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">¡Guardado!</span>
                )}
            </div>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                    !disabled
                        ? 'Escribe notas o recordatorios para este contacto...'
                        : 'Abre un chat para tomar notas...'
                }
                disabled={disabled}
                className="w-full h-20 p-2.5 text-xs bg-slate-50/90 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 text-slate-800 resize-none disabled:opacity-50 [color-scheme:light]"
            />
            <button
                onClick={onSave}
                disabled={disabled}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#9e1114] hover:bg-[#800d10] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
            >
                <Save className="w-3.5 h-3.5" />
                Guardar Nota
            </button>
        </div>
    );
}
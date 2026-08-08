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
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#e8181e]" />
                    Notas del Cliente
                </span>
                {isSaved && (
                    <span className="text-[10px] text-emerald-600 font-medium">¡Guardado!</span>
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
                className="w-full h-20 p-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-red-400 text-slate-800 resize-none disabled:opacity-50"
            />
            <button
                onClick={onSave}
                disabled={disabled}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#e8181e] hover:bg-[#9e1114] disabled:opacity-50 text-white font-medium text-xs rounded-md transition-colors shadow-sm"
            >
                <Save className="w-3.5 h-3.5" />
                Guardar Nota
            </button>
        </div>
    );
}
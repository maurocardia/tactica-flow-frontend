import React from 'react';
import { Sparkles, FileText, Mic, PenTool } from 'lucide-react';

export default function AiModule() {
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-purple-700">
                    <Sparkles className="w-3.5 h-3.5" /> Inteligencia Artificial
                </span>
                <span className="normal-case font-normal text-slate-400">OpenAI</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-purple-100 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold transition">
                    <FileText className="w-3.5 h-3.5" /> Resumir charla
                </button>
                <button className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-purple-100 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold transition">
                    <Mic className="w-3.5 h-3.5" /> Transcribir
                    <span className="bg-purple-700 text-white rounded-full text-[10px] px-1.5 py-0.2">3</span>
                </button>
                <button className="col-span-2 flex items-center justify-center gap-1.5 p-2 rounded-lg border border-purple-100 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold transition">
                    <PenTool className="w-3.5 h-3.5" /> Redactar respuesta
                </button>
            </div>
        </div>
    );
}
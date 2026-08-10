import React, { useState } from 'react';
import { Bot, ChevronDown, X, Loader2 } from 'lucide-react';
import { useAutoReply } from '@/hooks/useAutoReply';
import { BotFlowModal } from './BotFlowModal';

const ChatbotModule: React.FC = () => {
  const [enabled, setEnabled] = useState(true);
  const [showFlowModal, setShowFlowModal] = useState(false);

  const { pending, cancelPendingReply, testWithLastMessage } = useAutoReply(enabled);

  const autoReplyBanner = pending && (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 text-[11px]">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-amber-800">Auto-respuesta en {pending.secondsLeft}s</span>
        <p className="text-amber-700 truncate">"{pending.replyText}"</p>
      </div>
      <button
        onClick={cancelPendingReply}
        className="p-1 rounded-md hover:bg-amber-100 text-amber-700 shrink-0"
        title="Cancelar envío"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-2.5">
      {autoReplyBanner}
      {/* Header con Switch */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase">
        <div className="flex items-center gap-1.5">
          <Bot className="w-4 h-4 text-slate-600" />
          <span>CHATBOT / AUTOATENCIÓN</span>
        </div>
        {/* Toggle Switch */}
        <button
          onClick={() => setEnabled(!enabled)}
          className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${enabled ? 'bg-red-600 justify-end' : 'bg-slate-300 justify-start'}`}
        >
          <span className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform" />
        </button>
      </div>

      {/* Selector de Base de conocimiento */}
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="text-slate-600 text-[11px] leading-tight">
          Base de conocimiento de este chat
        </span>
        <div className="relative">
          <select className="appearance-none bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-3 py-1 pr-6 text-slate-700 focus:outline-none">
            <option>Ventas</option>
            <option>Soporte</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-1.5 top-1.5 pointer-events-none" />
        </div>
      </div>

      <p className="text-[10px] text-slate-500 leading-tight">
        Flujo: <strong className="text-slate-700">Bienvenida + Calificación</strong> · Deriva a humano fuera de horario.
      </p>

      {/* Botones inferiores */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <button
          onClick={() => setShowFlowModal(true)}
          className="bg-slate-100 hover:bg-slate-200 text-red-800 font-bold text-xs py-2 px-2 rounded-lg transition-colors border border-slate-200/60"
        >
          Editar flujo
        </button>
        <button className="bg-slate-100 hover:bg-slate-200 text-red-800 font-bold text-xs py-2 px-2 rounded-lg transition-colors border border-slate-200/60 leading-tight">
          Bases de conocimiento
        </button>
      </div>

      {showFlowModal && <BotFlowModal onClose={() => setShowFlowModal(false)} onTest={testWithLastMessage} />}
    </div>
  );
};

export default ChatbotModule;

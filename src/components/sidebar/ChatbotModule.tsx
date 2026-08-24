import React, { useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, X, Loader2, Sparkles } from 'lucide-react';
import { useAutoReply } from '@/hooks/useAutoReply';
import { useKnowledgeBases } from '@/state/KnowledgeBaseContext';
import { useModal } from '@/state/ModalContext';
import { useAppState } from '@/state/AppStateContext';
import { useAuth } from '@/state/AuthContext';
import { ApiService } from '@/services/api.service';
import { Toggle } from '@/components/ui/Toggle';
import { BotFlowModal } from './BotFlowModal';

const ChatbotModule: React.FC = () => {
  const { config, setConfig } = useAppState();
  const { user } = useAuth();
  const enabled = config.botEnabled;

  // Al loguearse (o al reabrir el panel con la sesión ya hidratada), consulta el estado real del
  // switch directo al backend en vez de confiar en el `user` cacheado en AuthContext — ese objeto
  // puede quedar desactualizado si `bot_enabled` cambió por otra vía. Se hace una sola vez por
  // sesión de usuario para no pisar un toggle que el usuario acaba de hacer acá mismo.
  const syncedUserId = useRef<number | null>(null);
  useEffect(() => {
    if (!user || syncedUserId.current === user.id) return;
    syncedUserId.current = user.id;
    let cancelled = false;
    ApiService.getMe()
      .then((freshUser) => {
        if (!cancelled) setConfig((c) => ({ ...c, botEnabled: freshUser.botEnabled }));
      })
      .catch((err) => {
        console.error('[ChatbotModule] No se pudo consultar el estado real del bot:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [user, setConfig]);

  const setEnabled = (v: boolean) => {
    setConfig((c) => ({ ...c, botEnabled: v }));
    if (user) {
      ApiService.setBotEnabled(v).catch((err) => {
        console.error('[ChatbotModule] No se pudo sincronizar el estado del bot con el backend:', err);
      });
    }
  };
  const [aiFallbackEnabled, setAiFallbackEnabled] = useState(false);
  const [showFlowModal, setShowFlowModal] = useState(false);
  const { bases } = useKnowledgeBases();
  const { openModal } = useModal();

  const { pending, cancelPendingReply, testWithLastMessage } = useAutoReply(enabled, aiFallbackEnabled);

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

      {/* Selector de Base de conocimiento (activa/global, ver KnowledgeBaseModal) */}
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="text-slate-600 text-[11px] leading-tight">
          Base activa para el bot
        </span>
        <div className="relative">
          <select className="appearance-none bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-3 py-1 pr-6 text-slate-700 focus:outline-none" disabled={bases.length === 0}>
            {bases.length === 0 ? (
              <option>Sin bases cargadas</option>
            ) : (
              bases.filter((b) => b.isActive).length > 0 ? (
                bases.filter((b) => b.isActive).map((b) => <option key={b.id}>{b.title}</option>)
              ) : (
                <option>Ninguna activa</option>
              )
            )}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-1.5 top-1.5 pointer-events-none" />
        </div>
      </div>

      {/* Fallback a IA cuando ninguna regla matchea (motor real, mismo que "Probar") */}
      <div className="flex items-center justify-between gap-2 bg-purple-50/60 border border-purple-100 rounded-lg px-2.5 py-2">
        <span className="flex items-center gap-1.5 text-[11px] text-purple-800 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          Responder con IA
        </span>
        <Toggle size="sm" checked={aiFallbackEnabled} onChange={setAiFallbackEnabled} />
      </div>

      {/* Botones inferiores */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <button
          onClick={() => setShowFlowModal(true)}
          className="bg-slate-100 hover:bg-slate-200 text-red-800 font-bold text-xs py-2 px-2 rounded-lg transition-colors border border-slate-200/60"
        >
          Editar flujo
        </button>
        <button
          onClick={() => openModal('knowledge-base')}
          className="bg-slate-100 hover:bg-slate-200 text-red-800 font-bold text-xs py-2 px-2 rounded-lg transition-colors border border-slate-200/60 leading-tight"
        >
          Bases de conocimiento
        </button>
      </div>

      {showFlowModal && <BotFlowModal onClose={() => setShowFlowModal(false)} onTest={testWithLastMessage} />}
    </div>
  );
};

export default ChatbotModule;

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

  // Al loguearse (o al reabrir el panel con la sesión ya hidratada), consulta el estado real de
  // los switches directo al backend en vez de confiar en el `user` cacheado en AuthContext — ese
  // objeto puede quedar desactualizado si `bot_enabled`/`ai_fallback_enabled` cambiaron por otra
  // vía. Se hace una sola vez por sesión de usuario para no pisar un toggle que el usuario acaba
  // de hacer acá mismo.
  const syncedUserId = useRef<number | null>(null);
  useEffect(() => {
    if (!user || syncedUserId.current === user.id) return;
    syncedUserId.current = user.id;
    let cancelled = false;
    ApiService.getMe()
      .then((freshUser) => {
        if (!cancelled) {
          setConfig((c) => ({
            ...c,
            botEnabled: freshUser.botEnabled,
            aiFallbackEnabled: freshUser.aiFallbackEnabled,
          }));
        }
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

  const aiFallbackEnabled = config.aiFallbackEnabled;
  const setAiFallbackEnabled = (v: boolean) => {
    setConfig((c) => ({ ...c, aiFallbackEnabled: v }));
    if (user) {
      ApiService.setAiFallbackEnabled(v).catch((err) => {
        console.error('[ChatbotModule] No se pudo sincronizar el fallback de IA con el backend:', err);
      });
    }
  };

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
    <div className="glass-card glass-card-hover p-3.5 flex flex-col gap-3">
      {autoReplyBanner}
      {/* Header con Switch */}
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-red-500/15 text-[#9e1114] flex items-center justify-center shadow-2xs">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold text-slate-900">CHATBOT / AUTOATENCIÓN</span>
        </div>
        {/* Toggle Switch */}
        <button
          onClick={() => setEnabled(!enabled)}
          className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${enabled ? 'bg-[#9e1114] justify-end shadow-xs' : 'bg-slate-300 justify-start'}`}
        >
          <span className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform" />
        </button>
      </div>

      {/* Selector de Base de conocimiento */}
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="text-slate-800 font-bold text-[11px] leading-tight">
          Base activa para el bot
        </span>
        <div className="relative">
          <select className="appearance-none glass-pill text-xs font-bold px-3 py-1.5 pr-6 text-slate-800 focus:outline-none [color-scheme:light] rounded-xl cursor-pointer" disabled={bases.length === 0}>
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
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Fallback a IA cuando ninguna regla matchea */}
      <div className="flex items-center justify-between gap-2 bg-purple-500/10 border border-purple-200/60 rounded-xl px-3 py-2 backdrop-blur-xs">
        <span className="flex items-center gap-1.5 text-[11px] text-purple-950 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          Responder con IA
        </span>
        <Toggle size="sm" checked={aiFallbackEnabled} onChange={setAiFallbackEnabled} />
      </div>

      {/* Botones inferiores */}
      <div className="grid grid-cols-2 gap-2 mt-0.5">
        <button
          onClick={() => setShowFlowModal(true)}
          className="glass-pill hover:bg-red-50/70 text-[#9e1114] font-bold text-xs py-2.5 px-2 rounded-xl transition-all border border-red-200/50 shadow-2xs text-center cursor-pointer hover:scale-[1.02]"
        >
          Editar flujo
        </button>
        <button
          onClick={() => openModal('knowledge-base')}
          className="glass-pill hover:bg-red-50/70 text-[#9e1114] font-bold text-xs py-2.5 px-2 rounded-xl transition-all border border-red-200/50 shadow-2xs text-center leading-tight cursor-pointer hover:scale-[1.02]"
        >
          Bases de conocimiento
        </button>
      </div>

      {showFlowModal && <BotFlowModal onClose={() => setShowFlowModal(false)} onTest={testWithLastMessage} />}
    </div>
  );
};

export default ChatbotModule;

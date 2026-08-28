import React, { useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, X, Loader2, Sparkles, Settings, Users, ExternalLink, GripVertical, Pencil, Check } from 'lucide-react';
import { useAutoReply } from '@/hooks/useAutoReply';
import { useKnowledgeBases } from '@/state/KnowledgeBaseContext';
import { useModal } from '@/state/ModalContext';
import { useAppState } from '@/state/AppStateContext';
import { useAuth } from '@/state/AuthContext';
import { ApiService } from '@/services/api.service';
import { Toggle } from '@/components/ui/Toggle';

const SECTION_IDS = ['botStatus', 'newContacts', 'aiReply', 'knowledgeBase'] as const;
type SectionId = (typeof SECTION_IDS)[number];
const DEFAULT_SECTION_ORDER: SectionId[] = [...SECTION_IDS];

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
            botEnabledForNewContacts: freshUser.botEnabledForNewContacts,
            botReplyToAll: freshUser.botReplyToAll,
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

  const botEnabledForNewContacts = config.botEnabledForNewContacts;
  const setBotEnabledForNewContacts = (v: boolean) => {
    setConfig((c) => ({ ...c, botEnabledForNewContacts: v }));
    if (user) {
      ApiService.setBotEnabledForNewContacts(v).catch((err) => {
        console.error('[ChatbotModule] No se pudo sincronizar el switch de contactos nuevos con el backend:', err);
      });
    }
  };

  const botReplyToAll = config.botReplyToAll;
  const setBotReplyToAll = (v: boolean) => {
    setConfig((c) => ({ ...c, botReplyToAll: v }));
    if (user) {
      ApiService.setBotReplyToAll(v).catch((err) => {
        console.error('[ChatbotModule] No se pudo sincronizar el modo de respuesta con el backend:', err);
      });
    }
  };

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

  // Estado del bot: un solo control de 3 vías en vez de un switch maestro separado + el modo de
  // respuesta — "Ninguno" y el switch maestro controlaban literalmente el mismo dato del backend
  // (botEnabled), así que tenerlos separados era redundante y podía mostrar cosas contradictorias.
  const botMode: 'none' | 'selected' | 'all' = !enabled ? 'none' : botReplyToAll ? 'all' : 'selected';

  // Orden de las secciones de abajo, a gusto del usuario (arrastrando el ícono de agarre) — se
  // guarda en config, que ya persiste solo en chrome.storage.local (ver AppStateContext). Si el
  // valor guardado no tiene exactamente estos 4 ids (config viejo de antes de este cambio, o
  // corrupto), cae al orden por default en vez de romper.
  const sectionOrder: SectionId[] =
    config.chatbotSectionOrder?.length === SECTION_IDS.length &&
    SECTION_IDS.every((id) => config.chatbotSectionOrder.includes(id))
      ? (config.chatbotSectionOrder as SectionId[])
      : DEFAULT_SECTION_ORDER;

  const [draggingId, setDraggingId] = useState<SectionId | null>(null);
  // El ícono de agarre solo aparece en "modo edición" — mostrarlo siempre arriesgaba arrastres
  // accidentales al tocar cerca de un switch durante el uso normal del panel.
  const [editingOrder, setEditingOrder] = useState(false);

  const moveSection = (draggedId: SectionId, targetId: SectionId) => {
    if (draggedId === targetId) return;
    const current = sectionOrder.slice();
    const from = current.indexOf(draggedId);
    const to = current.indexOf(targetId);
    if (from === -1 || to === -1) return;
    current.splice(from, 1);
    current.splice(to, 0, draggedId);
    setConfig((c) => ({ ...c, chatbotSectionOrder: current }));
  };

  const sectionContent: Record<SectionId, React.ReactNode> = {
    botStatus: (
      // Estado del bot: apagado del todo, respondiendo solo a contactos/grupos habilitados a
      // mano en la lista, o respondiendo a todos sin excepción — un doble clic en
      // "Contactos/Grupos", o el botón de la esquina, abre esa lista directo (ver
      // ContactBotSwitchesModal, que administra ambas pestañas). El botón de acceso solo tiene
      // sentido en el modo "Contactos/Grupos" — en los otros dos esa lista queda ignorada del
      // lado del backend (ver WhatsappService.handleIncomingMessage).
      <div className="flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-700 dark:text-slate-200 font-bold">Estado del bot</span>
          {botMode === 'selected' && (
            <button
              onClick={() => openModal('contact-bot-switches')}
              title="Administrar la lista de contactos y grupos"
              className="p-1 rounded-md text-[#9e1114] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-900/60">
          <button
            onClick={() => setEnabled(false)}
            className={`flex-1 text-[10.5px] font-bold py-1.5 rounded-md transition-colors cursor-pointer ${
              botMode === 'none'
                ? 'bg-white dark:bg-slate-700 text-[#9e1114] dark:text-red-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Ninguno
          </button>
          <button
            onClick={() => {
              setEnabled(true);
              setBotReplyToAll(false);
            }}
            onDoubleClick={() => {
              setEnabled(true);
              setBotReplyToAll(false);
              openModal('contact-bot-switches');
            }}
            title="Un clic para elegir este modo, doble clic para administrar la lista"
            className={`flex-1 text-[10.5px] font-bold py-1.5 rounded-md transition-colors cursor-pointer ${
              botMode === 'selected'
                ? 'bg-white dark:bg-slate-700 text-[#9e1114] dark:text-red-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Contactos/Grupos
          </button>
          <button
            onClick={() => {
              setEnabled(true);
              setBotReplyToAll(true);
            }}
            className={`flex-1 text-[10.5px] font-bold py-1.5 rounded-md transition-colors cursor-pointer ${
              botMode === 'all'
                ? 'bg-white dark:bg-slate-700 text-[#9e1114] dark:text-red-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Todos
          </button>
        </div>
      </div>
    ),
    newContacts: (
      // Un contacto que escribe por primera vez arranca con el bot apagado por default (hay que
      // prenderlo a mano en la lista) — con esto arranca ya prendido.
      <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-200 font-bold">
          <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          Activar bot para contactos nuevos
        </span>
        <Toggle size="sm" checked={botEnabledForNewContacts} onChange={setBotEnabledForNewContacts} />
      </div>
    ),
    aiReply: (
      // Fallback a IA cuando ninguna regla matchea
      <div className="flex items-center justify-between gap-2 bg-purple-500/10 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/70 rounded-xl px-3 py-2 backdrop-blur-xs">
        <span className="flex items-center gap-1.5 text-[11px] text-purple-950 dark:text-purple-200 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          Responder con IA
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openModal('ai-agent-config')}
            title="Configurar Agente IA"
            className="p-1 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-600 dark:text-purple-300 cursor-pointer transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <Toggle size="sm" checked={aiFallbackEnabled} onChange={setAiFallbackEnabled} />
        </div>
      </div>
    ),
    knowledgeBase: (
      // Selector de Base de conocimiento
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="text-slate-800 dark:text-slate-200 font-bold text-[11px] leading-tight">
          Base activa para el bot
        </span>
        <div className="relative">
          <select className="appearance-none glass-pill text-xs font-bold px-3 py-1.5 pr-6 text-slate-800 dark:text-slate-100 dark:bg-slate-800/90 focus:outline-none [color-scheme:light] rounded-xl cursor-pointer" disabled={bases.length === 0}>
            {bases.length === 0 ? (
              <option>Sin bases cargadas</option>
            ) : bases.filter((b) => b.isActive).length > 0 ? (
              bases.filter((b) => b.isActive).map((b) => <option key={b.id}>{b.title}</option>)
            ) : (
              <option>Ninguna activa</option>
            )}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
        </div>
      </div>
    ),
  };

  return (
    <div className="glass-card glass-card-hover p-3.5 flex flex-col gap-3">
      {autoReplyBanner}
      {/* Header (sin switch — el apagado/prendido ahora vive en "Estado del bot" de abajo) */}
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-red-500/15 dark:bg-red-950/80 text-[#9e1114] dark:text-red-400 flex items-center justify-center shadow-2xs">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold text-slate-900 dark:text-slate-100">CHATBOT / AUTOATENCIÓN</span>
        </div>
        <button
          onClick={() => setEditingOrder((v) => !v)}
          title={editingOrder ? 'Listo, terminar de reordenar' : 'Reordenar las secciones de abajo'}
          className={`p-1 rounded-md cursor-pointer transition-colors ${
            editingOrder
              ? 'text-white bg-[#9e1114] hover:bg-[#800d10]'
              : 'text-slate-400 dark:text-slate-500 hover:text-[#9e1114] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
          }`}
        >
          {editingOrder ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Secciones reordenables a gusto del usuario — arrastrar del ícono de agarre, que solo
          aparece en "modo edición" (ver botón de lápiz de arriba). */}
      {sectionOrder.map((id) => (
        <div
          key={id}
          draggable={editingOrder}
          onDragStart={() => editingOrder && setDraggingId(id)}
          onDragOver={(e) => editingOrder && e.preventDefault()}
          onDrop={() => {
            if (editingOrder && draggingId) moveSection(draggingId, id);
            setDraggingId(null);
          }}
          onDragEnd={() => setDraggingId(null)}
          className={`flex items-center gap-1 transition-opacity ${draggingId === id ? 'opacity-40' : ''}`}
        >
          {editingOrder && (
            <span className="shrink-0 text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing" title="Arrastrar para reordenar">
              <GripVertical className="w-3.5 h-3.5" />
            </span>
          )}
          <div className="flex-1 min-w-0">{sectionContent[id]}</div>
        </div>
      ))}

      {/* Botones inferiores */}
      <div className="grid grid-cols-2 gap-2 mt-0.5">
        <button
          onClick={() => openModal('bot-flow')}
          className="glass-pill hover:bg-red-50/70 dark:hover:bg-slate-800 text-[#9e1114] dark:text-red-300 font-bold text-xs py-2.5 px-2 rounded-xl transition-all border border-red-200/50 dark:border-red-900/60 shadow-2xs text-center cursor-pointer hover:scale-[1.02]"
        >
          Editar flujo
        </button>
        <button
          onClick={() => openModal('knowledge-base')}
          className="glass-pill hover:bg-red-50/70 dark:hover:bg-slate-800 text-[#9e1114] dark:text-red-300 font-bold text-xs py-2.5 px-2 rounded-xl transition-all border border-red-200/50 dark:border-red-900/60 shadow-2xs text-center leading-tight cursor-pointer hover:scale-[1.02]"
        >
          Bases de conocimiento
        </button>
      </div>
    </div>
  );
};

export default ChatbotModule;

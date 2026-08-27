import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Download, ChevronDown, Check, Calendar, Clock, Eye, Sparkles, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { DOMService } from '@/services/dom.service';
import { ApiService } from '@/services/api.service';
import { Conversation } from '@/types/conversation';
import { useAppState } from '@/state/AppStateContext';
import { useKnowledgeBases } from '@/state/KnowledgeBaseContext';

type Status = 'loading-chat' | 'selecting' | 'loading' | 'done' | 'error' | 'not-found';
type ScopeFilter = 'today' | '24h' | '7d' | 'visible';

export const AiSummaryModal: React.FC<{ onClose: () => void; contactName: string }> = ({ onClose, contactName }) => {
  const { config } = useAppState();
  const { bases } = useKnowledgeBases();
  const [status, setStatus] = useState<Status>('loading-chat');
  const [scope, setScope] = useState<ScopeFilter>('today');
  const [groupConversations, setGroupConversations] = useState<Conversation[]>([]);
  const [individualConversation, setIndividualConversation] = useState<Conversation | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [messageCount, setMessageCount] = useState<number>(0);

  // Carga inicial: resetea estado e identifica el chat abierto
  useEffect(() => {
    let cancelled = false;

    setSummary('');
    setMessageCount(0);
    setIndividualConversation(null);
    setGroupConversations([]);
    DOMService.clearChatCache();

    const run = async () => {
      const title = DOMService.getChatTitle() || contactName;
      if (!title) {
        if (!cancelled) setStatus('not-found');
        return;
      }

      try {
        // Sincronización automática de pantalla a base de datos al abrir el modal
        const visibleMessages = DOMService.getVisibleMessages('all');
        await ApiService.syncConversationMessages({
          phone: title,
          name: title,
          messages: visibleMessages.map((m) => ({
            sender: m.sender === 'them' ? 'customer' : 'agent',
            text: m.text,
            createdAt:
              m.dateCategory === 'past'
                ? new Date(Date.now() - 3 * 86400 * 1000).toISOString()
                : new Date().toISOString()
          })),
          mode: 'replace'
        }).catch((err) => console.warn('[AiSummaryModal] Auto-sync inicial falló:', err));

        const conversations = await ApiService.getConversations();
        if (cancelled) return;

        const group = conversations.filter((c) => c.groupName === title);
        if (group.length > 0) {
          setGroupConversations(group);
          setStatus('selecting');
          return;
        }

        const individual = conversations.find((c) => c.name === title || c.phone === title) || null;
        setIndividualConversation(individual);
        setStatus('loading');
      } catch (err) {
        console.warn('[AiSummaryModal] Falló consulta al backend, usando mensajes del DOM:', err);
        setIndividualConversation(null);
        setStatus('loading');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [contactName]);

  // Genera el resumen cuando cambia el scope o el estado inicial
  useEffect(() => {
    if (status === 'loading') {
      if (groupConversations.length > 0) {
        const target = selected.size === 0 ? groupConversations : groupConversations.filter((c) => selected.has(c.id));
        generateSummary(target, scope);
      } else {
        generateSummary(individualConversation ? [individualConversation] : [], scope);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, scope]);

  const toggleParticipant = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pickerLabel = useMemo(() => {
    if (selected.size === 0) return 'Todos los participantes';
    if (selected.size === 1) {
      const one = groupConversations.find((c) => c.id === [...selected][0]);
      return one?.name || '1 seleccionado';
    }
    return `${selected.size} participantes seleccionados`;
  }, [selected, groupConversations]);

  const filterBackendMessages = (messages: any[], filter: ScopeFilter) => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return messages.filter((m) => {
      const dateStr = m.createdAt || m.created_at;
      if (!dateStr) return false;
      const msgTime = new Date(dateStr).getTime();
      if (isNaN(msgTime)) return false;

      if (filter === 'today') return msgTime >= startOfToday.getTime();
      if (filter === '24h') return msgTime >= now - 24 * 3600 * 1000;
      if (filter === '7d') return msgTime >= now - 7 * 24 * 3600 * 1000;
      return true; // 'all'
    });
  };

  const generateSummary = async (conversations: Conversation[], currentScope: ScopeFilter) => {
    setStatus('loading');
    setPickerOpen(false);

    try {
      let lines: string[] = [];

      if (currentScope === 'visible') {
        const visibleMessages = DOMService.getVisibleMessages('all');
        lines = visibleMessages.map((m) => `${m.sender === 'them' ? contactName : 'Nosotros'}: ${m.text}`);
      } else if (currentScope === 'today') {
        // 1. Buscar mensajes de hoy en el backend
        if (conversations.length > 0) {
          const messagesByConversation = await Promise.all(
            conversations.map(async (c) => ({
              conversation: c,
              messages: await ApiService.getMessages(c.id).catch(() => [])
            }))
          );

          for (const { conversation, messages } of messagesByConversation) {
            const filtered = filterBackendMessages(messages, 'today');
            for (const m of filtered) {
              const who = m.sender === 'customer' ? conversation.name : 'Nosotros';
              lines.push(`${who}: ${m.text}`);
            }
          }
        }

        // 2. Si no hay en el backend, buscar únicamente mensajes bajo el separador "HOY" en el chat visible
        if (lines.length === 0) {
          const visibleToday = DOMService.getVisibleMessages('today');
          lines = visibleToday.map((m) => `${m.sender === 'them' ? contactName : 'Nosotros'}: ${m.text}`);
        }
      } else if (currentScope === '24h' || currentScope === '7d') {
        if (conversations.length > 0) {
          const messagesByConversation = await Promise.all(
            conversations.map(async (c) => ({
              conversation: c,
              messages: await ApiService.getMessages(c.id).catch(() => [])
            }))
          );

          for (const { conversation, messages } of messagesByConversation) {
            const filtered = filterBackendMessages(messages, currentScope);
            for (const m of filtered) {
              const who = m.sender === 'customer' ? conversation.name : 'Nosotros';
              lines.push(`${who}: ${m.text}`);
            }
          }
        }

        // Si no hay en backend, en el DOM solo hoy/ayer para 24h
        if (lines.length === 0 && currentScope === '24h') {
          const visibleToday = DOMService.getVisibleMessages('today');
          lines = visibleToday.map((m) => `${m.sender === 'them' ? contactName : 'Nosotros'}: ${m.text}`);
        }
      }

      if (lines.length === 0) {
        setStatus('not-found');
        return;
      }

      setMessageCount(lines.length);
      const transcript = lines.join('\n');

      // Contexto extra opcional de la Base de Conocimiento asignada
      let kbContext = '';
      const selectedBase = config.aiSummaryKnowledgeBaseId
        ? bases.find((b) => b.id === config.aiSummaryKnowledgeBaseId)
        : null;
      if (selectedBase) {
        try {
          const docs = await ApiService.getKbDocuments(selectedBase.id);
          if (docs.length > 0) {
            kbContext =
              `\n\n=== INFORMACIÓN DE LA BASE DE CONOCIMIENTO "${selectedBase.title}" ===\n` +
              docs.map((d) => `• [${d.filename}]: ${d.preview}`).join('\n') +
              `\n=== FIN BASE DE CONOCIMIENTO ===`;
          }
        } catch (err) {
          console.warn('[AiSummaryModal] No se pudo cargar KB para resumen:', err);
        }
      }

      const scopeTextMap: Record<ScopeFilter, string> = {
        today: 'de los mensajes del día de HOY',
        '24h': 'de las ÚLTIMAS 24 HORAS',
        '7d': 'de los ÚLTIMOS 7 DÍAS',
        visible: 'de los mensajes VISIBLES en pantalla'
      };

      const prompt = `TAREA: Elaborar un resumen ejecutivo y fiel de la siguiente conversación de WhatsApp con ${contactName} enfocado en ${scopeTextMap[currentScope]}.

REGLAS ESTRICTAS DE FIDELIDAD (IMPORTANTE):
1. FIDELIDAD TOTAL A LA CONVERSACIÓN: Resume ÚNICA Y EXCLUSIVAMENTE lo que los participantes realmente dijeron en la sección === CONVERSACIÓN ===.
2. PROHIBIDO ALUCINAR O FORZAR TEMAS DE NEGOCIO: Si la conversación trata de un tema informal, de salud, un saludo cotidiano o algo no relacionado con ventas, resume exactamente lo que hablaron. NUNCA inventes que el cliente fue a una ferretería, compró materiales o hizo pedidos si eso no fue escrito en el chat.
3. USO DE LA BASE DE CONOCIMIENTO: La base de conocimiento solo debe utilizarse como guía técnica SI los términos o productos ya fueron mencionados en el chat. Si no fueron mencionados, no introduzcas conceptos ajenos a la conversación.

${config.aiSummaryPrompt ? `INSTRUCCIÓN PERSONALIZADA:\n${config.aiSummaryPrompt}\n` : ''}
${kbContext}

=== CONVERSACIÓN (${lines.length} mensajes) ===
${transcript}
=== FIN CONVERSACIÓN ===

Estructura del resumen:
- **Temas clave:** (descripción verídica de lo que se habló)
- **Requerimientos del cliente:** (lo que el contacto expresó, o "Ninguno relevante" si fue casual)
- **Acuerdos:** (solo si se acordó algo real en el chat, sino indicar "Ninguno")`;

      const response = await ApiService.aiChat(prompt);

      setSummary(response.reply);
      setStatus('done');
    } catch (err) {
      console.error('[AiSummaryModal] Error al pedir el resumen:', err);
      setStatus('error');
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncChat = async () => {
    setIsSyncing(true);
    DOMService.clearChatCache();
    const visibleMessages = DOMService.getVisibleMessages('all');
    const title = DOMService.getChatTitle() || contactName;

    try {
      await ApiService.syncConversationMessages({
        phone: individualConversation?.phone || title,
        name: title,
        groupName: groupConversations.length > 0 ? title : null,
        messages: visibleMessages.map((m) => ({
          sender: m.sender === 'them' ? 'customer' : 'agent',
          text: m.text,
          createdAt:
            m.dateCategory === 'past'
              ? new Date(Date.now() - 3 * 86400 * 1000).toISOString()
              : new Date().toISOString()
        })),
        mode: 'replace' // Reemplaza en DB para que si se borró el chat quede 100% limpio
      });

      const updatedConversations = await ApiService.getConversations();
      const updated = updatedConversations.find((c) => c.name === title || c.phone === title) || null;
      if (updated) setIndividualConversation(updated);

      generateSummary(updated ? [updated] : [], scope);
    } catch (err) {
      console.error('[AiSummaryModal] Error al sincronizar chat con DB:', err);
      setStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleScopeChange = (newScope: ScopeFilter) => {
    setScope(newScope);
    setStatus('loading');
  };

  const handleDownload = () => {
    const fecha = new Date().toLocaleString('es-AR');
    const quien =
      selected.size > 0
        ? groupConversations.filter((c) => selected.has(c.id)).map((c) => c.name).join(', ')
        : contactName;
    const contenido = `Resumen IA de la conversación con ${quien}\nFecha de generación: ${fecha}\nAlcance: ${scope}\nMensajes analizados: ${messageCount}\n\n${summary}`;
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const safeName = quien.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen-${safeName || 'chat'}-${scope}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      title="Resumen IA de la conversación"
      onClose={onClose}
      headerColor="bg-purple-600"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSyncChat}
              disabled={status === 'loading' || isSyncing}
              className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100/60 dark:hover:bg-purple-950/60 px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Sincroniza con la pantalla y regenera el resumen actualizado"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status === 'loading' || isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Actualizar Resumen'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={status !== 'done'}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Descargar
            </button>
          </div>
        </div>
      }
    >
      {/* Selector de Rango / Alcance */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200">
          Alcance del resumen:
        </label>
        <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[10.5px] font-bold">
          <button
            onClick={() => handleScopeChange('today')}
            className={`py-1.5 px-1 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
              scope === 'today'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-3 h-3 shrink-0" />
            <span>Hoy</span>
          </button>
          <button
            onClick={() => handleScopeChange('24h')}
            className={`py-1.5 px-1 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
              scope === '24h'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Clock className="w-3 h-3 shrink-0" />
            <span>24h</span>
          </button>
          <button
            onClick={() => handleScopeChange('7d')}
            className={`py-1.5 px-1 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
              scope === '7d'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>7 días</span>
          </button>
          <button
            onClick={() => handleScopeChange('visible')}
            className={`py-1.5 px-1 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
              scope === 'visible'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3 h-3 shrink-0" />
            <span>Pantalla</span>
          </button>
        </div>
      </div>

      {groupConversations.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold"
          >
            <span className="truncate">{pickerLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {pickerOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              <button
                onClick={() => setSelected(new Set())}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100"
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selected.size === 0 ? 'bg-purple-600 border-purple-600' : 'border-slate-300'}`}>
                  {selected.size === 0 && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                Todos los participantes
              </button>
              {groupConversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleParticipant(c.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-slate-800 dark:text-slate-200"
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selected.has(c.id) ? 'bg-purple-600 border-purple-600' : 'border-slate-300'}`}>
                    {selected.has(c.id) && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(status === 'loading-chat' || status === 'loading') && (
        <div className="flex flex-col items-center gap-2 text-purple-700 dark:text-purple-300 py-8 justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-bold">Generando resumen ejecutivo con IA...</span>
        </div>
      )}

      {status === 'not-found' && (
        <div className="text-center py-6 flex flex-col gap-2.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 my-2">
          <Calendar className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto" />
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {scope === 'today'
              ? 'No hay mensajes registrados en el día de hoy.'
              : `No se encontraron mensajes en el rango seleccionado (${scope}).`}
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Los mensajes de este chat son de fechas anteriores. Tocá <button onClick={() => handleScopeChange('24h')} className="font-bold text-purple-600 dark:text-purple-400 underline cursor-pointer">"24h"</button>, <button onClick={() => handleScopeChange('7d')} className="font-bold text-purple-600 dark:text-purple-400 underline cursor-pointer">"7 días"</button> o <button onClick={() => handleScopeChange('visible')} className="font-bold text-purple-600 dark:text-purple-400 underline cursor-pointer">"Pantalla"</button> arriba para resumir los mensajes anteriores.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-xs font-semibold text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-3">
          Hubo un error al procesar el resumen con IA. Verificá la conexión o probá de nuevo.
        </div>
      )}

      {status === 'done' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-purple-800 dark:text-purple-300 px-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Resumen ({messageCount} mensajes analizados)
            </span>
            <span className="bg-purple-100/80 dark:bg-purple-900/60 px-2 py-0.5 rounded-full uppercase">
              {scope === 'today' ? 'Hoy' : scope === '24h' ? 'Últimas 24h' : scope === '7d' ? '7 Días' : scope === 'visible' ? 'Pantalla' : 'Todo'}
            </span>
          </div>

          <div className="bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/60 rounded-2xl p-3.5 text-xs text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto font-medium shadow-2xs">
            {summary}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AiSummaryModal;

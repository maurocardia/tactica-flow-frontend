import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Download, ChevronDown, Check, Sparkles, RefreshCw, XCircle, History } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { DOMService, VisibleMessage } from '@/services/dom.service';
import { ApiService } from '@/services/api.service';
import { Conversation } from '@/types/conversation';
import { useAppState } from '@/state/AppStateContext';
import { useKnowledgeBases } from '@/state/KnowledgeBaseContext';

type Status = 'loading-chat' | 'selecting' | 'loading' | 'done' | 'error' | 'not-found';

// Prefiere la fecha/hora REAL del mensaje (leída de data-pre-plain-text en el DOM, ver
// DOMService.parseMessageDateTime) — si no se pudo parsear (formato de idioma distinto, mensaje
// sin ese atributo), cae a la aproximación vieja de "hoy = ahora, pasado = hace 3 días".
const toCreatedAt = (m: VisibleMessage): string => {
  if (m.at) return m.at.toISOString();
  return m.dateCategory === 'past'
    ? new Date(Date.now() - 3 * 86400 * 1000).toISOString()
    : new Date().toISOString();
};

const formatRangeDate = (d: Date): string =>
  d.toLocaleString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

export const AiSummaryModal: React.FC<{ onClose: () => void; contactName: string }> = ({ onClose, contactName }) => {
  const { config } = useAppState();
  const { bases } = useKnowledgeBases();
  const [status, setStatus] = useState<Status>('loading-chat');
  const [groupConversations, setGroupConversations] = useState<Conversation[]>([]);
  const [individualConversation, setIndividualConversation] = useState<Conversation | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [messageCount, setMessageCount] = useState<number>(0);
  // Rango real de fechas que alcanzó a cubrir el resumen (min/max de los mensajes incluidos).
  const [messageRange, setMessageRange] = useState<{ from: Date; to: Date } | null>(null);

  // Id del último mensaje guardado ANTES de que "Cargar más mensajes" empiece a traer historial
  // extra, y el id de la conversación real donde está escribiendo (la que devuelven los propios
  // syncs, no la que arma la lista de participantes del grupo). Si el usuario ignora el resumen o
  // cierra el modal, todo lo insertado después de ese id se borra — ese historial se trajo solo
  // para calcular ESE resumen puntual, no para quedar archivado permanentemente.
  const sessionBaselineIdRef = useRef<number | null>(null);
  const syncConversationIdRef = useRef<number | null>(null);

  // Carga inicial: resetea estado e identifica el chat abierto
  useEffect(() => {
    let cancelled = false;

    setSummary('');
    setMessageCount(0);
    setMessageRange(null);
    setIndividualConversation(null);
    setGroupConversations([]);
    sessionBaselineIdRef.current = null;
    syncConversationIdRef.current = null;
    DOMService.clearChatCache();

    const run = async () => {
      const title = DOMService.getChatTitle() || contactName;
      if (!title) {
        if (!cancelled) setStatus('not-found');
        return;
      }

      try {
        // Sincronización automática de pantalla a base de datos al abrir el modal — esto también
        // fija la línea base: cualquier mensaje que "Cargar más mensajes" agregue DESPUÉS de este
        // id es historial traído solo para el resumen, y se revierte al cerrar/ignorar.
        const visibleMessages = DOMService.getVisibleMessages('all');
        const initialSync = await ApiService.syncConversationMessages({
          phone: title,
          name: title,
          messages: visibleMessages.map((m) => ({
            sender: m.sender === 'them' ? 'customer' : 'agent',
            text: m.text,
            createdAt: toCreatedAt(m)
          })),
          mode: 'replace'
        }).catch((err) => {
          console.warn('[AiSummaryModal] Auto-sync inicial falló:', err);
          return null;
        });
        if (initialSync && !cancelled) {
          // mode:'replace' ya vació la tabla antes de insertar lo visible en pantalla, así que si
          // no hay ningún mensaje visible el "antes" real es 0 filas, no "sin línea base conocida".
          sessionBaselineIdRef.current = initialSync.lastMessageId ?? 0;
          syncConversationIdRef.current = initialSync.conversation?.id ?? null;
        }

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

  // Genera el resumen cuando cambia el estado inicial
  useEffect(() => {
    if (status === 'loading') {
      if (groupConversations.length > 0) {
        const target = selected.size === 0 ? groupConversations : groupConversations.filter((c) => selected.has(c.id));
        generateSummary(target);
      } else {
        generateSummary(individualConversation ? [individualConversation] : []);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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

  const generateSummary = async (conversations: Conversation[]) => {
    setStatus('loading');
    setPickerOpen(false);

    try {
      // Cada entrada guarda su fecha real (si se pudo conseguir) para mostrar el rango real de
      // fechas que alcanzó a tomar el resumen.
      const entries: { line: string; at: Date | null }[] = [];

      if (conversations.length > 0) {
        const messagesByConversation = await Promise.all(
          conversations.map(async (c) => ({
            conversation: c,
            messages: await ApiService.getMessages(c.id).catch(() => [])
          }))
        );

        for (const { conversation, messages } of messagesByConversation) {
          for (const m of messages) {
            const who = m.sender === 'customer' ? conversation.name : 'Nosotros';
            const at = new Date(m.createdAt);
            entries.push({ line: `${who}: ${m.text}`, at: isNaN(at.getTime()) ? null : at });
          }
        }
      }

      // Si el backend no tiene nada (falló el sync inicial o el chat recién se abrió), cae a lo
      // visible en pantalla.
      if (entries.length === 0) {
        const visibleMessages = DOMService.getVisibleMessages('all');
        for (const m of visibleMessages) {
          entries.push({ line: `${m.sender === 'them' ? contactName : 'Nosotros'}: ${m.text}`, at: m.at || null });
        }
      }

      if (entries.length === 0) {
        setStatus('not-found');
        return;
      }

      const lines = entries.map((e) => e.line);
      const dates = entries.map((e) => e.at).filter((d): d is Date => d !== null);
      setMessageRange(
        dates.length > 0
          ? { from: new Date(Math.min(...dates.map((d) => d.getTime()))), to: new Date(Math.max(...dates.map((d) => d.getTime()))) }
          : null
      );
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

      const prompt = `TAREA: Elaborar un resumen ejecutivo y fiel de la siguiente conversación de WhatsApp con ${contactName}.

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
      const resync = await ApiService.syncConversationMessages({
        phone: individualConversation?.phone || title,
        name: title,
        groupName: groupConversations.length > 0 ? title : null,
        messages: visibleMessages.map((m) => ({
          sender: m.sender === 'them' ? 'customer' : 'agent',
          text: m.text,
          createdAt: toCreatedAt(m)
        })),
        mode: 'replace' // Reemplaza en DB para que si se borró el chat quede 100% limpio
      });
      // Este replace vuelve a dejar la tabla en "solo lo visible en pantalla" — se corre la línea
      // base hasta acá, para que un "Ignorar" posterior no borre nada de esto.
      sessionBaselineIdRef.current = resync.lastMessageId ?? 0;
      syncConversationIdRef.current = resync.conversation?.id ?? null;

      const updatedConversations = await ApiService.getConversations();
      const updated = updatedConversations.find((c) => c.name === title || c.phone === title) || null;
      if (updated) setIndividualConversation(updated);

      generateSummary(updated ? [updated] : []);
    } catch (err) {
      console.error('[AiSummaryModal] Error al sincronizar chat con DB:', err);
      setStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedMoreCount, setLoadedMoreCount] = useState<number | null>(null);

  // "Cargar más mensajes": scrollea el chat hacia arriba para que WhatsApp vaya trayendo historial
  // más viejo, y cada tanda que aparece se guarda en la base (mode: 'merge', no pisa lo que ya
  // había) con su fecha real. No regenera el resumen solo — hay que tocar "Actualizar Resumen"
  // después para que lo recién cargado entre en el resumen.
  const handleLoadMore = async () => {
    setLoadingMore(true);
    setLoadedMoreCount(0);
    const title = DOMService.getChatTitle() || contactName;

    try {
      const result = await DOMService.loadOlderMessages({ maxSteps: 15 }, async (batch) => {
        const res = await ApiService.syncConversationMessages({
          phone: individualConversation?.phone || title,
          name: title,
          groupName: groupConversations.length > 0 ? title : null,
          messages: batch.map((m) => ({
            sender: m.sender === 'them' ? 'customer' : 'agent',
            text: m.text,
            createdAt: toCreatedAt(m)
          })),
          mode: 'merge'
        }).catch((err) => {
          console.warn('[AiSummaryModal] No se pudo guardar una tanda de mensajes viejos:', err);
          return null;
        });
        if (res?.conversation?.id) syncConversationIdRef.current = res.conversation.id;
        setLoadedMoreCount((prev) => (prev ?? 0) + batch.length);
      });
      console.log('[AiSummaryModal] Carga de mensajes antiguos terminada:', result);
    } catch (err) {
      console.error('[AiSummaryModal] Error cargando mensajes antiguos:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // El historial que trajo "Cargar más mensajes" solo se pidió para calcular ESE resumen puntual —
  // si el usuario lo ignora o cierra el modal sin bajar el resumen, se borra de la base todo lo
  // insertado después de la línea base para no dejar historial de más ahí guardado.
  const handleClose = () => {
    const conversationId = syncConversationIdRef.current;
    const baselineId = sessionBaselineIdRef.current;
    if (conversationId && baselineId !== null) {
      ApiService.rollbackConversationMessages(conversationId, baselineId).catch((err) =>
        console.warn('[AiSummaryModal] No se pudo revertir el historial temporal:', err)
      );
    }
    onClose();
  };

  const handleDownload = () => {
    const fecha = new Date().toLocaleString('es-AR');
    const quien =
      selected.size > 0
        ? groupConversations.filter((c) => selected.has(c.id)).map((c) => c.name).join(', ')
        : contactName;
    const contenido = `Resumen IA de la conversación con ${quien}\nFecha de generación: ${fecha}\nMensajes analizados: ${messageCount}\n\n${summary}`;
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const safeName = quien.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen-${safeName || 'chat'}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      title="Resumen IA de la conversación"
      onClose={handleClose}
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
              onClick={handleClose}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              title="Cerrar sin guardar el historial extra que se haya traído para este resumen"
            >
              <XCircle className="w-3.5 h-3.5" /> Ignorar
            </button>
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
      {/* Trae más historial anterior scrolleando el chat hacia arriba (como haría un humano) y lo
          va guardando en la base a medida que aparece, con su fecha real. */}
      <div className="flex flex-col gap-1">
        <button
          onClick={handleLoadMore}
          disabled={loadingMore || status === 'loading'}
          className="w-full flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer transition-colors"
        >
          <History className={`w-3.5 h-3.5 ${loadingMore ? 'animate-pulse' : ''}`} />
          {loadingMore ? `Cargando mensajes antiguos... (${loadedMoreCount ?? 0})` : 'Cargar más mensajes'}
        </button>
        {!loadingMore && loadedMoreCount !== null && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
            Se guardaron {loadedMoreCount} mensajes más. Tocá "Actualizar Resumen" para incluirlos.
          </p>
        )}
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
          <History className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto" />
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            No se encontraron mensajes para resumir.
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Tocá <span className="font-bold text-purple-600 dark:text-purple-400">"Cargar más mensajes"</span> arriba para traer historial anterior del chat.
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
          <div className="flex flex-col gap-0.5 text-[10.5px] font-bold text-purple-800 dark:text-purple-300 px-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {messageCount} mensajes
              {messageRange && (
                <span className="font-semibold normal-case">
                  {' '}
                  desde el {formatRangeDate(messageRange.from)} hasta el {formatRangeDate(messageRange.to)}
                </span>
              )}
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

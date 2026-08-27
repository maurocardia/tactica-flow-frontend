import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Download, ChevronDown, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { DOMService } from '@/services/dom.service';
import { ApiService } from '@/services/api.service';
import { Conversation } from '@/types/conversation';
import { useAppState } from '@/state/AppStateContext';
import { useKnowledgeBases } from '@/state/KnowledgeBaseContext';

type Status = 'loading-chat' | 'selecting' | 'loading' | 'done' | 'error' | 'not-found';

// Resume la charla usando datos REALES del backend (Postgres), no lo que esté cargado en
// pantalla en ese momento — a diferencia del enfoque anterior (leer el DOM del chat abierto),
// esto no depende de cuánto se scrolleó ni de atributos internos de WhatsApp Web que pueden
// cambiar, y en un grupo identifica a cada participante por su conversación real (guardada por
// número, ver WhatsappService.handleIncomingMessage), no por el nombre visible en pantalla.
//
// El único dato que sigue viniendo del DOM es el título del chat abierto (DOMService.getChatTitle,
// ya usado en toda la extensión para saber "qué chat está abierto ahora") — con eso se busca la
// conversación (o, si es un grupo, TODAS las conversaciones de sus participantes) en el backend.
export const AiSummaryModal: React.FC<{ onClose: () => void; contactName: string }> = ({ onClose, contactName }) => {
  const { config } = useAppState();
  const { bases } = useKnowledgeBases();
  const [status, setStatus] = useState<Status>('loading-chat');
  const [groupConversations, setGroupConversations] = useState<Conversation[]>([]);
  const [individualConversation, setIndividualConversation] = useState<Conversation | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [summary, setSummary] = useState('');

  // Busca en el backend la(s) conversación(es) que correspondan al chat abierto ahora mismo.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const title = DOMService.getChatTitle();
      if (!title) {
        if (!cancelled) setStatus('not-found');
        return;
      }

      try {
        const conversations = await ApiService.getConversations();
        if (cancelled) return;

        const group = conversations.filter((c) => c.groupName === title);
        if (group.length > 0) {
          setGroupConversations(group);
          setStatus('selecting');
          return;
        }

        const individual = conversations.find((c) => c.name === title || c.phone === title) || null;
        if (individual) {
          setIndividualConversation(individual);
          setStatus('loading');
        } else {
          setStatus('not-found');
        }
      } catch (err) {
        console.error('[AiSummaryModal] No se pudo consultar las conversaciones del backend:', err);
        if (!cancelled) setStatus('not-found');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Chat individual con conversación encontrada: arranca solo, no hay nada que elegir.
  useEffect(() => {
    if (status === 'loading' && individualConversation) {
      generateSummary([individualConversation]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, individualConversation]);

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
      const messagesByConversation = await Promise.all(
        conversations.map(async (c) => ({ conversation: c, messages: await ApiService.getMessages(c.id) }))
      );

      const lines: string[] = [];
      for (const { conversation, messages } of messagesByConversation) {
        for (const m of messages) {
          const who = m.sender === 'customer' ? conversation.name : 'Nosotros';
          lines.push(`${who}: ${m.text}`);
        }
      }

      if (lines.length === 0) {
        setStatus('not-found');
        return;
      }

      const transcript = lines.join('\n');

      // Contexto extra opcional: si el usuario asignó una base de conocimiento en "Configurar
      // Resumen IA", se agregan los previews de sus documentos (no el texto completo — eso solo
      // lo tiene el backend, ver KnowledgeBaseService.getActiveContext()).
      let kbContext = '';
      const selectedBase = config.aiSummaryKnowledgeBaseId
        ? bases.find((b) => b.id === config.aiSummaryKnowledgeBaseId)
        : null;
      if (selectedBase) {
        try {
          const docs = await ApiService.getKbDocuments(selectedBase.id);
          if (docs.length > 0) {
            kbContext =
              `\n\nContexto de referencia de la base "${selectedBase.title}":\n` +
              docs.map((d) => `- ${d.filename}: ${d.preview}`).join('\n');
          }
        } catch (err) {
          console.error('[AiSummaryModal] No se pudo cargar la base de conocimiento seleccionada:', err);
        }
      }

      const response = await ApiService.aiChat(`${config.aiSummaryPrompt}\n\n${transcript}${kbContext}`);
      setSummary(response.reply);
      setStatus('done');
    } catch (err) {
      console.error('[AiSummaryModal] Error al pedir el resumen:', err);
      setStatus('error');
    }
  };

  const handleResumirGrupo = () => {
    const target = selected.size === 0 ? groupConversations : groupConversations.filter((c) => selected.has(c.id));
    generateSummary(target);
  };

  // Descarga el resumen como .txt real — a diferencia de "Guardar en historial" (que necesitaría
  // un endpoint que todavía no existe), esto no depende de ningún backend: arma el archivo en el
  // navegador y dispara la descarga con un <a download> temporal.
  const handleDownload = () => {
    const fecha = new Date().toLocaleString('es-AR');
    const quien =
      selected.size > 0
        ? groupConversations.filter((c) => selected.has(c.id)).map((c) => c.name).join(', ')
        : contactName;
    const contenido = `Resumen IA de la conversación con ${quien}\n${fecha}\n\n${summary}`;
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
      onClose={onClose}
      headerColor="bg-purple-600"
      footer={
        <>
          <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg">
            Cerrar
          </button>
          <button
            disabled
            title="Próximamente"
            className="bg-purple-600/40 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-not-allowed"
          >
            Guardar en historial
          </button>
          <button
            onClick={handleDownload}
            disabled={status !== 'done'}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs px-4 py-2 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" /> Descargar
          </button>
        </>
      }
    >
      <p className="text-slate-500 bg-slate-50 rounded-lg p-2.5">
        {groupConversations.length > 0
          ? 'Este chat es un grupo. Elegí a quién resumir.'
          : `La IA resume la conversación real guardada con ${contactName}.`}
      </p>

      {groupConversations.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs bg-white text-slate-700"
          >
            <span className="truncate">{pickerLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {pickerOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
              <button
                onClick={() => setSelected(new Set())}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-slate-50 border-b border-slate-100 font-semibold text-slate-700"
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selected.size === 0 ? 'bg-red-600 border-red-600' : 'border-slate-300'}`}>
                  {selected.size === 0 && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                Todos los participantes
              </button>
              {groupConversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleParticipant(c.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-slate-50"
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selected.has(c.id) ? 'bg-red-600 border-red-600' : 'border-slate-300'}`}>
                    {selected.has(c.id) && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  <span className="truncate text-slate-700">{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {status === 'selecting' && (
        <button
          onClick={handleResumirGrupo}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs py-2 rounded-lg"
        >
          Resumir
        </button>
      )}

      {(status === 'loading-chat' || status === 'loading') && (
        <div className="flex items-center gap-2 text-slate-400 py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> {status === 'loading-chat' ? 'Buscando la conversación...' : 'Generando resumen...'}
        </div>
      )}

      {status === 'not-found' && (
        <p className="text-slate-500 text-center py-4">
          No encontré esta conversación registrada en el sistema (con mensajes reales). Asegurate de que el bot haya
          recibido al menos un mensaje de este chat — si es un grupo, también que "Responder también en grupos" esté
          activo.
        </p>
      )}

      {status === 'error' && (
        <p className="text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">
          Hubo un error al pedirle el resumen a la IA. Puede ser un problema temporal del servicio — reintentá en un rato.
        </p>
      )}

      {status === 'done' && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-slate-700 leading-relaxed whitespace-pre-wrap">
          {summary}
        </div>
      )}
    </Modal>
  );
};

export default AiSummaryModal;

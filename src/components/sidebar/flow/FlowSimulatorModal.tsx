// src/components/sidebar/flow/FlowSimulatorModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  RotateCcw,
  Bot,
  User,
  CheckCheck,
  Zap,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { BotFlowData, BotFlowNode } from '@/types/bot';

interface FlowSimulatorModalProps {
  flow: BotFlowData;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
  activeNodeTitle?: string;
}

export const FlowSimulatorModal: React.FC<FlowSimulatorModalProps> = ({
  flow,
  onClose
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_1',
      sender: 'system',
      text: 'Simulador en vivo del Flujo de Bot. Escribe un mensaje (ej: "hola", "precios", "1") para probar el recorrido de los bloques.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleReset = () => {
    setCurrentNodeId(null);
    setMessages([
      {
        id: `reset_${Date.now()}`,
        sender: 'system',
        text: 'Flujo reiniciado. Puedes comenzar una nueva conversación de prueba.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const executeNode = async (node: BotFlowNode) => {
    setCurrentNodeId(node.id);
    setIsTyping(true);

    if (node.type === 'DELAY') {
      const delay = (node.data.delaySeconds || 2) * 1000;
      await new Promise((r) => setTimeout(r, Math.min(delay, 2500)));
    } else {
      await new Promise((r) => setTimeout(r, 600));
    }

    setIsTyping(false);

    let textToSend = node.data.replyText || '';
    if (node.type === 'OPTIONS_MENU' && node.data.options && node.data.options.length > 0) {
      const optionsText = node.data.options
        .map((opt, i) => `${i + 1}️⃣ ${opt.label}`)
        .join('\n');
      textToSend = `${textToSend ? `${textToSend}\n\n` : ''}${optionsText}`;
    }

    if (node.type === 'CALL_AI') {
      textToSend = textToSend || '🤖 [Agente de IA]: Consulta procesada con éxito usando la Base de Conocimiento activa.';
    }

    if (node.type === 'HANDOFF') {
      textToSend = textToSend || '👤 [Derivación Humana]: Un asesor del equipo comercial se conectará con vos a la brevedad.';
    }

    if (textToSend) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: textToSend,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          activeNodeTitle: node.data.name || node.title
        }
      ]);
    }

    // Buscar conexión automática si no es menú múltiple
    if (node.type !== 'OPTIONS_MENU') {
      const outgoingConn = flow.connections.find((c) => c.sourceNodeId === node.id);
      if (outgoingConn) {
        const nextNode = flow.nodes.find((n) => n.id === outgoingConn.targetNodeId);
        if (nextNode) {
          executeNode(nextNode);
        }
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    const textLower = text.toLowerCase();

    // 1. Si estamos en un nodo activo con opciones
    if (currentNodeId) {
      const currentNode = flow.nodes.find((n) => n.id === currentNodeId);
      if (currentNode && currentNode.type === 'OPTIONS_MENU' && currentNode.data?.options) {
        const optionsList = currentNode.data.options;
        const optIndex = optionsList.findIndex(
          (opt, i) =>
            (opt.keyword && opt.keyword.toLowerCase() === textLower) ||
            opt.label.toLowerCase().includes(textLower) ||
            textLower === `${i + 1}` ||
            textLower === `${i + 1}.` ||
            textLower.startsWith(`${i + 1} `) ||
            textLower.startsWith(`${i + 1}. `)
        );

        if (optIndex !== -1) {
          const matchedOption = optionsList[optIndex];
          const optionPortId = matchedOption.id || `opt_${optIndex}`;

          // Buscar conexión saliente desde esa opción
          const conn = flow.connections.find(
            (c) =>
              c.sourceNodeId === currentNode.id &&
              (c.sourcePortId === optionPortId ||
               c.sourcePortId === matchedOption.id ||
               c.sourcePortId === `opt_${optIndex}` ||
               c.sourcePortId === `opt_${optIndex + 1}` ||
               c.sourcePortId === `${optIndex + 1}`)
          );

          if (conn) {
            const nextNode = flow.nodes.find((n) => n.id === conn.targetNodeId);
            if (nextNode) {
              executeNode(nextNode);
              return;
            }
          } else {
            // La opción fue seleccionada correctamente pero no tiene bloque conectado en el diagrama
            setTimeout(() => {
              setMessages((prev) => [
                ...prev,
                {
                  id: `opt_unconnected_${Date.now()}`,
                  sender: 'bot',
                  text: `✅ Elegiste la opción "${matchedOption.label}".\n\nℹ️ *(Aviso del Simulador: Este camino aún no tiene un bloque conectado en el diagrama visual).*`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  activeNodeTitle: currentNode.data?.name || currentNode.title
                }
              ]);
            }, 400);
            return;
          }
        }
      }
    }

    // 2. Buscar si coincide con el disparador de algún nodo por palabra clave
    const matchedNode = flow.nodes.find((n) => {
      if (!n.data.keywords || n.data.keywords.length === 0) return false;
      return n.data.keywords.some((kw) => textLower.includes(kw.toLowerCase()));
    });

    if (matchedNode) {
      executeNode(matchedNode);
      return;
    }

    // 3. Fallback: sin coincidencia
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `fallback_${Date.now()}`,
          sender: 'bot',
          text: 'No comprendí esa opción. Por favor escribe una de las opciones válidas o la palabra "hola" para reiniciar.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          activeNodeTitle: 'Fallback'
        }
      ]);
    }, 500);
  };

  return (
    <Modal
      title="Simulador de Flujo en Vivo (WhatsApp)"
      onClose={onClose}
      maxWidth="max-w-[480px]"
      headerColor="bg-emerald-600"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reiniciar Simulación
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            Listo
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-[460px] bg-[#efeae2] dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Chat Header */}
        <div className="px-4 py-2.5 bg-emerald-700 text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
            🤖
          </div>
          <div>
            <h4 className="font-bold text-xs">Bot Táctica Flow</h4>
            <span className="text-[10px] text-emerald-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              {isTyping ? 'Escribiendo...' : 'En línea'}
            </span>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
          {messages.map((msg) => {
            if (msg.sender === 'system') {
              return (
                <div
                  key={msg.id}
                  className="mx-auto max-w-[85%] text-center text-[10.5px] font-medium text-slate-600 dark:text-slate-400 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-2 rounded-xl"
                >
                  {msg.text}
                </div>
              );
            }

            const isMe = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {!isMe && msg.activeNodeTitle && (
                  <span className="text-[9.5px] font-bold text-emerald-800 dark:text-emerald-300 mb-0.5 ml-1 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> {msg.activeNodeTitle}
                  </span>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-xs whitespace-pre-line leading-relaxed ${
                    isMe
                      ? 'bg-[#d9fdd3] dark:bg-emerald-950/80 text-slate-900 dark:text-slate-100 rounded-tr-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                  }`}
                >
                  {msg.text}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400">
                    <span>{msg.timestamp}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-blue-500" />}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl rounded-tl-xs w-20 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-100" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-200" />
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un mensaje de prueba..."
            className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white cursor-pointer transition-colors shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </Modal>
  );
};

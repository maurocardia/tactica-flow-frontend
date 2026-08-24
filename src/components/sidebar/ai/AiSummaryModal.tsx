import React, { useEffect, useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { DOMService } from '@/services/dom.service';
import { ApiService } from '@/services/api.service';

type Status = 'loading' | 'done' | 'error' | 'empty';

// Resume de verdad la charla visible en el chat abierto (DOMService.getVisibleMessages + el
// agente real de IA vía /api/ai/chat), mostrado como popup dedicado en vez de metido en el
// mini-chat del módulo de IA — igual al mockup del cliente ("Resumen IA de la conversación").
export const AiSummaryModal: React.FC<{ onClose: () => void; contactName: string }> = ({ onClose, contactName }) => {
  const [status, setStatus] = useState<Status>('loading');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const messages = DOMService.getVisibleMessages();
      if (messages.length === 0) {
        if (!cancelled) setStatus('empty');
        return;
      }

      const transcript = messages.map((m) => `${m.sender === 'them' ? 'Cliente' : 'Nosotros'}: ${m.text}`).join('\n');
      try {
        const response = await ApiService.aiChat(
          `Resumí esta conversación de WhatsApp en tres partes, cada una en su propia línea, sin usar asteriscos ni markdown:\n` +
            `"Resumen: " (2-3 líneas con lo esencial)\n` +
            `"Puntos clave: " (lista corta separada por " · ")\n` +
            `"Próximo paso sugerido: " (una frase)\n\n${transcript}`
        );
        if (!cancelled) {
          setSummary(response.reply);
          setStatus('done');
        }
      } catch (err) {
        console.error('[AiSummaryModal] Error al pedir el resumen:', err);
        if (!cancelled) setStatus('error');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Descarga el resumen como .txt real — a diferencia de "Guardar en historial" (que necesitaría
  // un endpoint que todavía no existe), esto no depende de ningún backend: arma el archivo en el
  // navegador y dispara la descarga con un <a download> temporal.
  const handleDownload = () => {
    const fecha = new Date().toLocaleString('es-AR');
    const contenido = `Resumen IA de la conversación con ${contactName}\n${fecha}\n\n${summary}`;
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const safeName = contactName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
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
        La IA resume los mensajes cargados ahora mismo en la charla con {contactName}.
      </p>

      {status === 'loading' && (
        <div className="flex items-center gap-2 text-slate-400 py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Generando resumen...
        </div>
      )}

      {status === 'empty' && (
        <p className="text-slate-500 text-center py-4">
          No encontré mensajes cargados en este chat para resumir. Abrí una conversación con texto visible e intentá de nuevo.
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

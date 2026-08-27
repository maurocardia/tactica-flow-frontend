import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { useAppState } from '@/state/AppStateContext';
import { useKnowledgeBases } from '@/state/KnowledgeBaseContext';

// Configura el prompt que usa "Resumir charla" (ver AiSummaryModal) y, opcionalmente, una base
// de conocimiento cuyos documentos se agregan como contexto extra — igual al mockup del cliente
// ("Configurar Resumen IA"), pero honesto con lo que hay: el modelo es fijo (Gemini, lo único que
// soporta el backend hoy) en vez de un dropdown con motores que no existen.
export const AiSummaryConfigModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { config, setConfig } = useAppState();
  const { bases } = useKnowledgeBases();
  const [prompt, setPrompt] = useState(config.aiSummaryPrompt);
  const [kbId, setKbId] = useState<number | null>(config.aiSummaryKnowledgeBaseId);

  const handleSave = () => {
    setConfig((c) => ({
      ...c,
      aiSummaryPrompt: prompt.trim() || c.aiSummaryPrompt,
      aiSummaryKnowledgeBaseId: kbId,
    }));
    onClose();
  };

  return (
    <Modal
      title="Configurar Resumen IA"
      onClose={onClose}
      headerColor="bg-purple-600"
      footer={
        <div className="flex items-center justify-end w-full gap-2">
          <button
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="bg-[#9e1114] hover:bg-[#800d10] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            Guardar
          </button>
        </div>
      }
    >
      <Field label="Prompt del sistema (instrucciones para resumir)">
        <textarea
          className={`${fieldInputClass} resize-none min-h-[90px] leading-relaxed`}
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </Field>

      <div className="flex gap-2">
        <Field label="Modelo">
          <select className={fieldInputClass} disabled value="Gemini">
            <option>Gemini</option>
          </select>
        </Field>
        <Field label="Base de conocimiento">
          <select
            className={fieldInputClass}
            value={kbId ?? ''}
            onChange={(e) => setKbId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Sin base de conocimiento</option>
            {bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 leading-relaxed font-medium">
        Este prompt se usa cuando presionás "Resumir charla". Si elegís una base de conocimiento, sus documentos se
        agregan como referencia extra. Se puede cambiar en cualquier momento.
      </p>
    </Modal>
  );
};

export default AiSummaryConfigModal;

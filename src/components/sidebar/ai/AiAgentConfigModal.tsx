import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';
import { ApiService } from '@/services/api.service';
import { useAuth } from '@/state/AuthContext';
import { useKnowledgeBases } from '@/state/KnowledgeBaseContext';

// Configura el Agente IA real (bot de WhatsApp/Baileys, ver whatsapp.service.ts): el prompt de
// comportamiento (users.ai_custom_instructions, PUT /api/whatsapp/ai-custom-instructions) y qué
// bases de conocimiento están activas para que las use. Igual al bloque "Agente IA" del mockup
// del cliente, salvo el modelo (fijo en Gemini, lo único soportado hoy) y la base de
// conocimiento: el backend usa TODAS las bases activas a la vez (no una sola asignada), así que
// acá se listan con su propio switch en vez de un único dropdown.
export const AiAgentConfigModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const { bases, update: updateBase } = useKnowledgeBases();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ApiService.getMe()
      .then((freshUser) => {
        if (!cancelled) setPrompt(freshUser.aiCustomInstructions || '');
      })
      .catch((err) => {
        console.error('[AiAgentConfigModal] No se pudo cargar el prompt actual:', err);
        if (!cancelled) setError('No se pudo cargar el prompt actual.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await ApiService.setAiCustomInstructions(prompt.trim());
      onClose();
    } catch (err) {
      console.error('[AiAgentConfigModal] No se pudo guardar el prompt:', err);
      setError('No se pudo guardar el prompt. Probá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = bases.filter((b) => b.isActive).length;

  return (
    <Modal
      title="Configurar Agente IA"
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
            disabled={saving || loading}
            className="flex items-center gap-1.5 bg-[#9e1114] hover:bg-[#800d10] disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar
          </button>
        </div>
      }
    >
      {error && <div className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">{error}</div>}

      <Field label="Prompt del sistema (instrucciones para el agente)">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 py-2 justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando...
          </div>
        ) : (
          <textarea
            className={`${fieldInputClass} resize-none min-h-[85px] leading-relaxed`}
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Respondé consultas sobre nuestros productos usando la base de conocimiento. Si no sabés la respuesta, ofrecé derivar a un humano. Tono profesional y cordial."
          />
        )}
      </Field>

      <Field label="Modelo">
        <select className={fieldInputClass} disabled value="Gemini">
          <option>Gemini</option>
        </select>
      </Field>

      <Field label={`Bases de conocimiento (${activeCount} activa${activeCount === 1 ? '' : 's'})`}>
        <div className="flex flex-col gap-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 rounded-xl p-2.5">
          {bases.length === 0 ? (
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 text-center py-1 font-medium">Todavía no hay bases de conocimiento cargadas.</p>
          ) : (
            bases.map((base) => (
              <div key={base.id} className="flex items-center justify-between gap-2 py-0.5">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{base.title}</span>
                <Toggle
                  size="sm"
                  checked={base.isActive}
                  onChange={(v) => updateBase(base.id, { isActive: v }).catch((err) => console.error(err))}
                />
              </div>
            ))
          )}
        </div>
      </Field>

      <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 leading-relaxed font-medium">
        El agente responde usando este prompt y las bases de conocimiento activas de arriba. Si no hay ninguna
        activa, responde solo con el prompt.
      </p>
    </Modal>
  );
};

export default AiAgentConfigModal;

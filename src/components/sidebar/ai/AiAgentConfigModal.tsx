import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';
import { ApiService } from '@/services/api.service';
import { useAuth } from '@/state/AuthContext';
import { useKnowledgeBases } from '@/state/KnowledgeBaseContext';

// Proveedores/modelos soportados por el backend (Vercel AI SDK, ver ai.service.ts). El modelo
// por defecto de cada proveedor es el primero de su lista — tiene que ser el mismo que
// DEFAULT_MODEL_BY_PROVIDER en el backend para que el selector arranque en el valor real.
const AI_MODELS_BY_PROVIDER: Record<string, { value: string; label: string }[]> = {
  google: [
    { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite (rápido, recomendado)' },
    { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o mini (rápido, recomendado)' },
    { value: 'gpt-4o', label: 'GPT-4o' },
  ],
  anthropic: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (rápido, recomendado)' },
    { value: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
  ],
};

const AI_PROVIDERS: { value: string; label: string }[] = [
  { value: 'google', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
];

// Configura el Agente IA real (bot de WhatsApp/Baileys, ver whatsapp.service.ts): el proveedor y
// modelo de IA (Issue #8 [EPIC] IA Multi-Provider), el prompt de comportamiento
// (users.ai_custom_instructions, PUT /api/whatsapp/ai-custom-instructions) y qué bases de
// conocimiento están activas para que las use. Igual al bloque "Agente IA" del mockup del
// cliente, salvo la base de conocimiento: el backend usa TODAS las bases activas a la vez (no
// una sola asignada), así que acá se listan con su propio switch en vez de un único dropdown.
export const AiAgentConfigModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const { bases, update: updateBase } = useKnowledgeBases();
  const [prompt, setPrompt] = useState('');
  const [aiProvider, setAiProvider] = useState('google');
  const [aiModel, setAiModel] = useState('gemini-3.1-flash-lite');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ApiService.getMe()
      .then((freshUser) => {
        if (cancelled) return;
        setPrompt(freshUser.aiCustomInstructions || '');
        const provider = freshUser.aiProvider || 'google';
        setAiProvider(provider);
        setAiModel(freshUser.aiModel || AI_MODELS_BY_PROVIDER[provider]?.[0]?.value || 'gemini-3.1-flash-lite');
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

  // Al cambiar de proveedor, saltar al primer modelo de su lista (el anterior puede no existir ahí).
  const handleProviderChange = (provider: string) => {
    setAiProvider(provider);
    setAiModel(AI_MODELS_BY_PROVIDER[provider]?.[0]?.value || '');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        ApiService.setAiCustomInstructions(prompt.trim()),
        ApiService.setAiProviderAndModel(aiProvider, aiModel),
      ]);
      onClose();
    } catch (err) {
      console.error('[AiAgentConfigModal] No se pudo guardar la configuración:', err);
      setError('No se pudo guardar la configuración. Probá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = bases.filter((b) => b.isActive).length;
  const modelOptions = AI_MODELS_BY_PROVIDER[aiProvider] || [];

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

      <Field label="Proveedor de IA">
        <select
          className={fieldInputClass}
          value={aiProvider}
          disabled={loading}
          onChange={(e) => handleProviderChange(e.target.value)}
        >
          {AI_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Modelo">
        <select
          className={fieldInputClass}
          value={aiModel}
          disabled={loading}
          onChange={(e) => setAiModel(e.target.value)}
        >
          {modelOptions.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
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

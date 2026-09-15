import React, { useEffect, useState } from 'react';
import {
  Loader2,
  ChevronDown,
  User,
  Target,
  ShieldCheck,
  MessageSquare,
  Building2,
  Zap,
  FileText,
  ListChecks,
  Languages,
  Type,
  SlidersHorizontal,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';
import { ApiService } from '@/services/api.service';
import { useAuth } from '@/state/AuthContext';
import { useKnowledgeBases } from '@/state/KnowledgeBaseContext';
import { AiPromptSections as AgentPromptSections, AiGeneralRules as GeneralRules } from '@/types/auth';

type SectionKey = keyof AgentPromptSections;

const EMPTY_SECTIONS: AgentPromptSections = {
  behavior: '',
  objective: '',
  rules: '',
  tone: '',
  companyInfo: '',
  callToAction: '',
  notes: '',
};

// "Reglas generales": presets de comportamiento tan comunes que no tiene sentido escribirlos a
// mano en "Reglas absolutas" cada vez — un switch por regla en vez de texto libre. El backend las
// traduce a instrucciones concretas al armar el prompt final (ver AuthService.composeAiPrompt).
const DEFAULT_GENERAL_RULES: GeneralRules = {
  mainLanguage: 'es',
  followClientLanguage: true,
  noSwearing: true,
  neverInvent: true,
  shortAnswers: true,
  focusOnCompany: true,
  addressByFirstName: true,
  noSpecialCharacters: true,
  noEmojis: false,
  offerHumanAgent: true,
  protectSensitiveData: true,
};

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en', label: 'English' },
];

type ToggleRuleKey = Exclude<keyof GeneralRules, 'mainLanguage'>;

const TOGGLE_RULES: { key: ToggleRuleKey; label: string; icon: React.ReactNode }[] = [
  { key: 'followClientLanguage', label: 'Seguir idioma del cliente', icon: <Languages className="w-3.5 h-3.5" /> },
  { key: 'noSwearing', label: 'Sin groserías', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { key: 'neverInvent', label: 'Nunca inventar', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { key: 'shortAnswers', label: 'Respuestas cortas', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { key: 'focusOnCompany', label: 'Foco en la empresa', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { key: 'addressByFirstName', label: 'Llamar por el primer nombre', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { key: 'noSpecialCharacters', label: 'Sin caracteres especiales', icon: <Type className="w-3.5 h-3.5" /> },
  { key: 'noEmojis', label: 'Sin emojis', icon: <Type className="w-3.5 h-3.5" /> },
  { key: 'offerHumanAgent', label: 'Ofrecer atención humana', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { key: 'protectSensitiveData', label: 'Proteger datos sensibles', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
];

const SECTIONS: { key: SectionKey; title: string; icon: React.ReactNode; placeholder: string }[] = [
  {
    key: 'behavior',
    title: 'Comportamiento del asistente',
    icon: <User className="w-3.5 h-3.5" />,
    placeholder: 'Ej: Sos un asesor comercial de la empresa, cordial y resolutivo, que atiende por WhatsApp.',
  },
  {
    key: 'objective',
    title: 'Objetivo principal del asistente',
    icon: <Target className="w-3.5 h-3.5" />,
    placeholder: 'Ej: Responder consultas sobre productos y ayudar a cerrar pedidos usando la Base de Conocimiento.',
  },
  {
    key: 'rules',
    title: 'Reglas absolutas',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    placeholder: 'Ej: Nunca inventar precios ni stock. Si no sabés la respuesta, ofrecé derivar a un humano.',
  },
  {
    key: 'tone',
    title: 'Tono de voz',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    placeholder: 'Ej: Español rioplatense, tono profesional y cordial.',
  },
  {
    key: 'companyInfo',
    title: 'Información de la empresa',
    icon: <Building2 className="w-3.5 h-3.5" />,
    placeholder: 'Ej: Rubro, horarios de atención, zonas de entrega u otro contexto que el asistente deba conocer.',
  },
  {
    key: 'callToAction',
    title: 'Llamado a la acción',
    icon: <Zap className="w-3.5 h-3.5" />,
    placeholder: 'Ej: Siempre que se pueda, invitar a coordinar una llamada o confirmar el pedido.',
  },
  {
    key: 'notes',
    title: 'Notas adicionales',
    icon: <FileText className="w-3.5 h-3.5" />,
    placeholder: 'Cualquier instrucción adicional que no encaje en los apartados de arriba.',
  },
];

const SECTION_LABELS: Record<SectionKey, string> = {
  behavior: 'Comportamiento del asistente',
  objective: 'Objetivo principal',
  rules: 'Reglas absolutas',
  tone: 'Tono de voz',
  companyInfo: 'Información de la empresa',
  callToAction: 'Llamado a la acción',
  notes: 'Notas adicionales',
};

const GENERAL_RULES_LABEL = 'Reglas generales';

// Respaldo SOLO para cuentas viejas que todavía no tienen aiPromptConfig guardado (guardaron el
// prompt antes de que existiera esta columna, ver auth.service.ts) — reparte el texto plano viejo
// por sus rótulos conocidos para no perderlo. Las cuentas nuevas ya no pasan por acá: el backend
// devuelve los apartados y los switches de "Reglas generales" tal cual se guardaron.
function parsePrompt(raw: string): AgentPromptSections {
  const result: AgentPromptSections = { ...EMPTY_SECTIONS };
  if (!raw?.trim()) return result;

  const prefixToKey = SECTIONS.map((s) => ({ prefix: `${SECTION_LABELS[s.key]}:`, key: s.key }));
  const leftovers: string[] = [];

  for (const line of raw.split('\n')) {
    if (line.startsWith(`${GENERAL_RULES_LABEL}:`)) continue; // se recalcula desde los switches, no desde el texto
    const match = prefixToKey.find(({ prefix }) => line.startsWith(prefix));
    if (match) {
      const value = line.slice(match.prefix.length).trim();
      result[match.key] = result[match.key] ? `${result[match.key]}\n${value}` : value;
    } else if (line.trim()) {
      leftovers.push(line);
    }
  }
  if (leftovers.length) {
    result.notes = result.notes ? `${result.notes}\n${leftovers.join('\n')}` : leftovers.join('\n');
  }
  return result;
}

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
// (users.ai_custom_instructions, PUT /api/whatsapp/ai-custom-instructions) —ahora
// desglosado en apartados (comportamiento/objetivo/reglas/tono/empresa/CTA/notas) en vez de un
// solo textarea— y qué bases de conocimiento están activas para que las use.
export const AiAgentConfigModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const { bases, update: updateBase } = useKnowledgeBases();
  const [sections, setSections] = useState<AgentPromptSections>(EMPTY_SECTIONS);
  const [generalRules, setGeneralRules] = useState<GeneralRules>(DEFAULT_GENERAL_RULES);
  const [aiProvider, setAiProvider] = useState('google');
  const [aiModel, setAiModel] = useState('gemini-3.1-flash-lite');

  // Los 7 apartados de texto libre viven adentro de un solo menú desplegable ("Personalización
  // del asistente") para no llenar el modal de filas — "Reglas generales" queda aparte, visible
  // como su propia fila, tal como pidió el usuario.
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [openKey, setOpenKey] = useState<SectionKey | null>(null);
  const [generalRulesOpen, setGeneralRulesOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ApiService.getMe()
      .then((freshUser) => {
        if (cancelled) return;
        const provider = freshUser.aiProvider || 'google';
        setAiProvider(provider);
        setAiModel(freshUser.aiModel || AI_MODELS_BY_PROVIDER[provider]?.[0]?.value || 'gemini-3.1-flash-lite');

        if (freshUser.aiPromptConfig) {
          // Cuenta ya guardada con el formulario nuevo: los apartados y los switches de "Reglas
          // generales" vienen tal cual se dejaron la última vez, sin adivinar nada.
          setSections(freshUser.aiPromptConfig.sections);
          setGeneralRules(freshUser.aiPromptConfig.generalRules);
        } else {
          // Cuenta vieja: solo existe el texto plano de siempre, se reparte por apartados.
          setSections(parsePrompt(freshUser.aiCustomInstructions || ''));
        }
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

  const updateSection = (key: SectionKey, value: string) => setSections((prev) => ({ ...prev, [key]: value }));
  const updateRule = (key: ToggleRuleKey, value: boolean) => setGeneralRules((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      // El backend guarda los apartados + Reglas generales tal cual Y compone el texto final que
      // de verdad lee el bot (ai_custom_instructions) en la misma operación — ver
      // AuthService.setAiPromptConfig. Así el agente que corre en background (sin que el panel
      // esté abierto) siempre usa exactamente lo último guardado desde acá.
      await Promise.all([
        ApiService.setAiPromptConfig({ sections, generalRules }),
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
  const anySectionFilled = SECTIONS.some((s) => sections[s.key].trim().length > 0);

  const renderTextSection = ({ key, title, icon, placeholder }: (typeof SECTIONS)[number]) => {
    const isOpen = openKey === key;
    const filled = sections[key].trim().length > 0;
    return (
      <div key={key} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setOpenKey(isOpen ? null : key)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        >
          <span className={`shrink-0 ${filled ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>{icon}</span>
          <span className="flex-1 text-[11.5px] font-bold text-slate-800 dark:text-slate-200">{title}</span>
          {filled && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="px-3 pb-3 pt-0.5">
            <textarea
              className={`${fieldInputClass} resize-none min-h-[70px] leading-relaxed`}
              rows={3}
              value={sections[key]}
              onChange={(e) => updateSection(key, e.target.value)}
              placeholder={placeholder}
            />
          </div>
        )}
      </div>
    );
  };

  const generalRulesSection = (
    <div
      key="generalRules"
      className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900"
    >
      <button
        type="button"
        onClick={() => setGeneralRulesOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
      >
        <span className="shrink-0 text-purple-600 dark:text-purple-400">
          <ListChecks className="w-3.5 h-3.5" />
        </span>
        <span className="flex-1 text-[11.5px] font-bold text-slate-800 dark:text-slate-200">Reglas generales</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${generalRulesOpen ? 'rotate-180' : ''}`} />
      </button>
      {generalRulesOpen && (
        <div className="px-3 pb-3 pt-0.5 flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <Languages className="w-3.5 h-3.5 text-slate-400" /> Idioma principal
            </span>
            <select
              className="border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 [color-scheme:light] focus:outline-none focus:border-red-500"
              value={generalRules.mainLanguage}
              onChange={(e) => setGeneralRules((prev) => ({ ...prev, mainLanguage: e.target.value }))}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {TOGGLE_RULES.map(({ key, label, icon }) => (
            <div key={key} className="flex items-center justify-between gap-2 py-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <span className="text-slate-400">{icon}</span> {label}
              </span>
              <Toggle size="sm" checked={generalRules[key]} onChange={(v) => updateRule(key, v)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

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

      <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200 tracking-tight -mb-1">
        Prompt del sistema (instrucciones para el agente)
      </span>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-2 justify-center">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando...
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setPersonalizationOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className={`shrink-0 ${anySectionFilled ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </span>
              <span className="flex-1 text-[11.5px] font-bold text-slate-800 dark:text-slate-200">Personalización del asistente</span>
              {anySectionFilled && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />}
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${personalizationOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {personalizationOpen && (
              <div className="px-2 pb-2 pt-0.5 flex flex-col gap-1.5">{SECTIONS.map(renderTextSection)}</div>
            )}
          </div>

          {generalRulesSection}
        </div>
      )}

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

import React, { useEffect, useState } from 'react';
import {
  X,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  PlayCircle,
  MessageSquare,
  Bot,
  UserCheck,
  GitFork,
  Clock,
  Globe,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { ApiService } from '@/services/api.service';
import { KeywordRule, RuleAction } from '@/types/bot';

interface RuleFormState {
  id: string | null;
  name: string;
  keywords: string;
  replyText: string;
  action: RuleAction;
  isActive: boolean;
}

const EMPTY_FORM: RuleFormState = {
  id: null,
  name: '',
  keywords: '',
  replyText: '',
  action: 'STATIC_REPLY',
  isActive: true
};

const BLOCK_TYPES: { id: RuleAction; label: string; desc: string; icon: any; color: string; bg: string }[] = [
  {
    id: 'STATIC_REPLY',
    label: 'Mensaje / Respuesta',
    desc: 'Envía un mensaje de texto fijo con opciones o bienvenida',
    icon: MessageSquare,
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200'
  },
  {
    id: 'CALL_AI',
    label: 'Agente de IA',
    desc: 'Responde consultando la Base de Conocimiento activa',
    icon: Bot,
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200'
  },
  {
    id: 'HANDOFF',
    label: 'Derivación a Asesor',
    desc: 'Transfiere el chat a un asesor humano o rol comercial',
    icon: UserCheck,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200'
  },
  {
    id: 'CONDITION',
    label: 'Condición / Filtro',
    desc: 'Evalúa condición lógica o palabra clave para bifurcar',
    icon: GitFork,
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200'
  },
  {
    id: 'DELAY',
    label: 'Espera / Delay',
    desc: 'Pausa la ejecución durante unos segundos o minutos',
    icon: Clock,
    color: 'text-slate-700',
    bg: 'bg-slate-50 border-slate-200'
  },
  {
    id: 'WEBHOOK',
    label: 'Webhook Externo',
    desc: 'Dispara una petición HTTP a un sistema externo o CRM',
    icon: Globe,
    color: 'text-indigo-700',
    bg: 'bg-indigo-50 border-indigo-200'
  }
];

interface BotFlowModalProps {
  onClose: () => void;
  onTest: () => { text: string | null; matched: boolean };
}

export const BotFlowModal: React.FC<BotFlowModalProps> = ({ onClose, onTest }) => {
  const [rules, setRules] = useState<KeywordRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RuleFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      setRules(await ApiService.getBotRules());
    } catch (err) {
      console.error('[BotFlowModal] Error al cargar reglas:', err);
      setError('No se pudieron cargar las reglas del bot.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleToggleActive = async (rule: KeywordRule) => {
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r)));
    try {
      await ApiService.updateBotRule(rule.id, { isActive: !rule.isActive });
    } catch (err) {
      console.error('[BotFlowModal] Error al actualizar regla:', err);
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: rule.isActive } : r)));
    }
  };

  const handleDelete = async (rule: KeywordRule) => {
    if (!confirm(`¿Eliminar el bloque "${rule.name}"?`)) return;
    try {
      await ApiService.deleteBotRule(rule.id);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } catch (err) {
      console.error('[BotFlowModal] Error al eliminar regla:', err);
      setError('No se pudo eliminar el bloque.');
    }
  };

  const openNewForm = () => setForm({ ...EMPTY_FORM });
  const openEditForm = (rule: KeywordRule) =>
    setForm({
      id: rule.id,
      name: rule.name,
      keywords: rule.keywords.join(', '),
      replyText: rule.replyText,
      action: rule.action || 'STATIC_REPLY',
      isActive: rule.isActive
    });

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;
    const copy = [...rules];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setRules(copy);
  };

  const handleSaveForm = async () => {
    if (!form) return;
    const name = form.name.trim();
    const replyText = form.replyText.trim();
    const keywords = form.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    if (!name || keywords.length === 0) {
      setError('Completá el nombre del bloque y al menos una palabra clave.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (form.id) {
        const updated = await ApiService.updateBotRule(form.id, {
          name,
          keywords,
          replyText,
          action: form.action,
          isActive: form.isActive
        });
        setRules((prev) => prev.map((r) => (r.id === form.id ? updated : r)));
      } else {
        const created = await ApiService.createBotRule({
          name,
          keywords,
          replyText,
          action: form.action,
          isActive: form.isActive
        });
        setRules((prev) => [created, ...prev]);
      }
      setForm(null);
    } catch (err) {
      console.error('[BotFlowModal] Error al guardar regla:', err);
      setError('No se pudo guardar el bloque.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = () => {
    const result = onTest();
    if (!result.text) {
      setTestResult('No se encontró ningún mensaje entrante en el chat abierto.');
    } else if (!result.matched) {
      setTestResult(`Último mensaje: "${result.text}" — ningún bloque activo lo matchea.`);
    } else {
      setTestResult(`Último mensaje: "${result.text}" — matcheó y se está ejecutando el bloque.`);
    }
  };

  const getBlockMeta = (action: RuleAction) => {
    return BLOCK_TYPES.find((b) => b.id === action) || BLOCK_TYPES[0];
  };

  return (
    <div
      className="fixed inset-0 bg-black/55 flex items-center justify-center p-4"
      style={{ zIndex: 2147483647 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-[480px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#9e1114] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            <span className="font-bold text-sm">Editor de flujos del chatbot</span>
          </div>
          <button onClick={onClose} className="text-white/85 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3 overflow-y-auto text-xs">
          <div className="flex items-center justify-between text-slate-500 bg-slate-50 rounded-lg p-2.5 gap-2">
            <span>Configura bloques secuenciales de atención automática y reglas por palabras clave.</span>
            <button
              onClick={handleTest}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded hover:bg-slate-100 shrink-0"
              title="Probar contra el último mensaje entrante visible"
            >
              <PlayCircle className="w-3.5 h-3.5 text-emerald-600" /> Probar
            </button>
          </div>

          {error && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
              {error}
            </div>
          )}
          {testResult && (
            <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              {testResult}
            </div>
          )}

          {form ? (
            <div className="flex flex-col gap-3 border border-red-200 rounded-xl p-3 bg-red-50/20">
              <span className="font-bold text-xs text-slate-800">
                {form.id ? 'Editar bloque' : 'Nuevo bloque de flujo'}
              </span>

              {/* Selector de Tipo de Bloque */}
              <div>
                <label className="text-[10.5px] font-bold text-slate-600 mb-1 block uppercase">
                  Tipo de bloque
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {BLOCK_TYPES.map((bt) => {
                    const Icon = bt.icon;
                    const selected = form.action === bt.id;
                    return (
                      <button
                        key={bt.id}
                        type="button"
                        onClick={() => setForm({ ...form, action: bt.id })}
                        className={`p-2 rounded-lg border text-left flex items-start gap-2 transition-all ${
                          selected
                            ? `${bt.bg} border-current ${bt.color} ring-1 ring-current`
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <div className="flex flex-col">
                          <span className="font-bold text-[11px]">{bt.label}</span>
                          <span className="text-[9.5px] text-slate-500 leading-tight line-clamp-1">
                            {bt.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold text-slate-600">Nombre del bloque</span>
                <input
                  className="border border-slate-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-red-500 bg-white [color-scheme:light]"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Saludo de bienvenida / Cotización de stock"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold text-slate-600">
                  Palabras clave de disparo (separadas por coma)
                </span>
                <input
                  className="border border-slate-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-red-500 bg-white [color-scheme:light]"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  placeholder="hola, buenas, precio, catálogo"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold text-slate-600">
                  {form.action === 'CALL_AI'
                    ? 'Instrucción o prompt para este bloque'
                    : form.action === 'HANDOFF'
                    ? 'Mensaje al cliente antes de transferir'
                    : 'Texto de respuesta'}
                </span>
                <textarea
                  className="border border-slate-300 rounded-md px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:border-red-500 bg-white [color-scheme:light]"
                  rows={3}
                  value={form.replyText}
                  onChange={(e) => setForm({ ...form, replyText: e.target.value })}
                  placeholder={
                    form.action === 'CALL_AI'
                      ? 'Ej: Responde amablemente y ofrece enviar el catálogo PDF de la base de conocimiento...'
                      : 'Escribe el texto que responderá el bot...'
                  }
                />
              </label>

              <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span>Bloque activo en el chatbot</span>
              </label>

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveForm}
                  disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Guardar bloque
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 text-slate-400 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando bloques de flujo...
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-0.5">
              {rules.length === 0 && (
                <p className="text-[11px] text-slate-500 text-center py-4">Todavía no hay bloques cargados.</p>
              )}
              {rules.map((rule, idx) => {
                const meta = getBlockMeta(rule.action);
                const Icon = meta.icon;
                return (
                  <div
                    key={rule.id}
                    className="border border-slate-200 rounded-xl p-3 bg-white flex flex-col gap-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.bg} ${meta.color}`}>
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </span>
                        <b className="text-xs text-slate-800 truncate">{rule.name}</b>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMove(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30"
                          title="Subir"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMove(idx, 'down')}
                          disabled={idx === rules.length - 1}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30"
                          title="Bajar"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditForm(rule)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-500"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule)}
                          className="p-1 rounded hover:bg-red-50 text-red-500"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(rule)}
                          className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors ${
                            rule.isActive ? 'bg-red-600 justify-end' : 'bg-slate-300 justify-start'
                          }`}
                          title={rule.isActive ? 'Desactivar' : 'Activar'}
                        >
                          <span className="w-3.5 h-3.5 bg-white rounded-full shadow-md" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {rule.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>

                    {rule.replyText && (
                      <p className="text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11.5px] leading-relaxed line-clamp-3">
                        {rule.replyText}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!form && (
            <button
              onClick={openNewForm}
              className="flex items-center justify-center gap-1.5 bg-[#9e1114] hover:bg-[#850f11] text-white font-semibold text-xs py-2.5 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar nuevo bloque
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-3 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BotFlowModal;

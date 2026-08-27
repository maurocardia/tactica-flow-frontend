import React, { useEffect, useState } from 'react';
import {
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
import { Modal } from '@/components/ui/Modal';
import { DOMService } from '@/services/dom.service';

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
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800'
  },
  {
    id: 'CALL_AI',
    label: 'Agente de IA',
    desc: 'Responde consultando la Base de Conocimiento activa',
    icon: Bot,
    color: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800'
  },
  {
    id: 'HANDOFF',
    label: 'Derivación a Asesor',
    desc: 'Transfiere el chat a un asesor humano o rol comercial',
    icon: UserCheck,
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
  },
  {
    id: 'CONDITION',
    label: 'Condición / Filtro',
    desc: 'Bifurca según si el contacto es cliente o nuevo',
    icon: GitFork,
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800'
  },
  {
    id: 'DELAY',
    label: 'Espera / Delay',
    desc: 'Pausa la ejecución antes del siguiente bloque',
    icon: Clock,
    color: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
  },
  {
    id: 'WEBHOOK',
    label: 'Webhook Externo',
    desc: 'Envía los datos a un endpoint o API externa',
    icon: Globe,
    color: 'text-pink-700 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-950/50 border-pink-200 dark:border-pink-800'
  }
];

export const BotFlowModal: React.FC<{ onClose: () => void; onTest?: () => { text: string | null; matched: boolean } }> = ({
  onClose,
  onTest
}) => {
  const [rules, setRules] = useState<KeywordRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<RuleFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.getBotRules();
      setRules(data);
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar las reglas del bot.');
    } finally {
      setLoading(false);
    }
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

  const handleDelete = async (rule: KeywordRule) => {
    if (!window.confirm(`¿Eliminar el bloque "${rule.name}"?`)) return;
    try {
      setError(null);
      await ApiService.deleteBotRule(rule.id);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } catch (err) {
      console.error('[BotFlowModal] Error al eliminar regla:', err);
      setError('No se pudo eliminar el bloque.');
    }
  };

  const handleToggleActive = async (rule: KeywordRule) => {
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r)));
    try {
      await ApiService.updateBotRule(rule.id, { isActive: !rule.isActive });
    } catch (err) {
      console.error('[BotFlowModal] Error al actualizar regla:', err);
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: rule.isActive } : r)));
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;
    const copy = [...rules];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setRules(copy);
  };

  const openNewForm = () => {
    setError(null);
    setTestResult(null);
    setForm({ ...EMPTY_FORM });
  };

  const openEditForm = (rule: KeywordRule) => {
    setError(null);
    setTestResult(null);
    setForm({
      id: rule.id,
      name: rule.name,
      keywords: rule.keywords.join(', '),
      replyText: rule.replyText,
      action: rule.action || 'STATIC_REPLY',
      isActive: rule.isActive
    });
  };

  const handleTest = () => {
    setTestResult(null);
    setError(null);
    if (onTest) {
      const result = onTest();
      if (!result.text) {
        setTestResult('No se encontró ningún mensaje entrante en el chat abierto.');
      } else if (!result.matched) {
        setTestResult(`Último mensaje: "${result.text}" — ningún bloque activo lo matchea.`);
      } else {
        setTestResult(`Último mensaje: "${result.text}" — matcheó y se ejecutará el bloque correspondiente.`);
      }
      return;
    }

    const msgs = DOMService.getChatMessages();
    const lastThem = [...msgs].reverse().find((m) => m.sender === 'them');
    if (!lastThem) {
      setTestResult('No hay mensajes entrantes del cliente visibles en el chat para probar.');
      return;
    }
    const lower = lastThem.text.toLowerCase();
    const matched = rules.find(
      (r) => r.isActive && r.keywords.some((k) => lower.includes(k.toLowerCase()))
    );
    if (matched) {
      setTestResult(
        `✅ Coincidencia con "${matched.name}": Responderá "${matched.replyText || matched.action}"`
      );
    } else {
      setTestResult(`ℹ️ Sin coincidencia para "${lastThem.text.slice(0, 30)}..." (Pasará a IA o asesor)`);
    }
  };

  const getBlockMeta = (action?: RuleAction) => {
    return BLOCK_TYPES.find((b) => b.id === action) || BLOCK_TYPES[0];
  };

  return (
    <Modal
      title="Editor de flujos del chatbot"
      onClose={onClose}
      maxWidth="max-w-[480px]"
      footer={
        <button
          onClick={onClose}
          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-5 py-2 rounded-xl transition-all cursor-pointer"
        >
          Cerrar
        </button>
      }
    >
      <div className="flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl p-3 gap-2 shadow-2xs">
        <span className="font-semibold text-[11px] leading-relaxed">Configura bloques secuenciales de atención automática y reglas por palabras clave.</span>
        <button
          onClick={handleTest}
          className="flex items-center gap-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0 cursor-pointer shadow-2xs transition-all"
          title="Probar contra el último mensaje entrante visible"
        >
          <PlayCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Probar
        </button>
      </div>

      {error && (
        <div className="text-xs font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
          {error}
        </div>
      )}
      {testResult && (
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">
          {testResult}
        </div>
      )}

      {form ? (
        <div className="flex flex-col gap-3 border border-red-200 dark:border-red-900/60 rounded-2xl p-3.5 bg-slate-50/90 dark:bg-slate-900/80 shadow-2xs">
          <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wide">
            {form.id ? 'Editar bloque' : 'Nuevo bloque de flujo'}
          </span>

          {/* Selector de Tipo de Bloque */}
          <div>
            <label className="text-[11px] font-bold text-slate-900 dark:text-slate-200 mb-1.5 block uppercase tracking-wide">
              Tipo de bloque
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_TYPES.map((bt) => {
                const Icon = bt.icon;
                const selected = form.action === bt.id;
                return (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => setForm({ ...form, action: bt.id })}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all cursor-pointer ${
                      selected
                        ? `${bt.bg} border-current ${bt.color} ring-2 ring-current shadow-xs`
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/70'
                    }`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold text-[11px]">{bt.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-1">
                        {bt.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200">Nombre del bloque</span>
            <input
              className="border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs [color-scheme:light]"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Saludo de bienvenida / Cotización de stock"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200">
              Palabras clave de disparo (separadas por coma)
            </span>
            <input
              className="border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs [color-scheme:light]"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              placeholder="hola, buenas, precio, catálogo"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200">
              {form.action === 'CALL_AI'
                ? 'Instrucción o prompt para este bloque'
                : form.action === 'HANDOFF'
                ? 'Mensaje al cliente antes de transferir'
                : 'Texto de respuesta'}
            </span>
            <textarea
              className="border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:border-red-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium shadow-2xs [color-scheme:light]"
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

          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
            />
            <span>Bloque activo en el chatbot</span>
          </label>

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setForm(null)}
              className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveForm}
              disabled={saving}
              className="flex-1 bg-[#9e1114] hover:bg-[#800d10] disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
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
        <div className="flex flex-col gap-3">
          {rules.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4 font-medium">Todavía no hay bloques cargados.</p>
          )}
          {rules.map((rule, idx) => {
            const meta = getBlockMeta(rule.action);
            const Icon = meta.icon;
            return (
              <div
                key={rule.id}
                className="border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 bg-white dark:bg-slate-800/90 flex flex-col gap-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold border ${meta.bg} ${meta.color} shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                      {meta.label}
                    </span>
                    <b className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{rule.name}</b>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-20 cursor-pointer"
                      title="Subir"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === rules.length - 1}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-20 cursor-pointer"
                      title="Bajar"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditForm(rule)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ml-1 ${
                        rule.isActive ? 'bg-[#9e1114] justify-end' : 'bg-slate-300 dark:bg-slate-600 justify-start'
                      }`}
                      title={rule.isActive ? 'Desactivar' : 'Activar'}
                    >
                      <span className="w-3.5 h-3.5 bg-white rounded-full shadow-md" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {rule.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-[10.5px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2.5 py-0.5 rounded-lg"
                    >
                      {kw}
                    </span>
                  ))}
                </div>

                {rule.replyText && (
                  <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium leading-relaxed whitespace-pre-wrap">
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
          className="flex items-center justify-center gap-2 bg-[#9e1114] hover:bg-[#800d10] text-white font-bold text-xs py-3 rounded-xl transition-all shadow-xs cursor-pointer mt-1 mb-1"
        >
          <Plus className="w-4 h-4" /> Agregar nuevo bloque
        </button>
      )}
    </Modal>
  );
};

export default BotFlowModal;

import React, { useEffect, useState } from 'react';
import { X, Pencil, Trash2, Plus, Loader2, PlayCircle } from 'lucide-react';
import { ApiService } from '@/services/api.service';
import { KeywordRule } from '@/types/bot';

interface RuleFormState {
  id: string | null;
  name: string;
  keywords: string;
  replyText: string;
  isActive: boolean;
}

const EMPTY_FORM: RuleFormState = { id: null, name: '', keywords: '', replyText: '', isActive: true };

interface BotFlowModalProps {
  onClose: () => void;
  onTest: () => { text: string | null; matched: boolean };
}

// Editor de flujo del chatbot, con el look de ventana emergente del prototipo, conectado a las
// mismas reglas de palabra clave que ya usa el motor real (useAutoReply / GET-POST-PUT-DELETE
// /api/bot/rules). Cada regla es un "bloque": nombre, palabras clave que lo disparan, respuesta
// y si está activo.
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
    setForm({ id: rule.id, name: rule.name, keywords: rule.keywords.join(', '), replyText: rule.replyText, isActive: rule.isActive });

  const handleSaveForm = async () => {
    if (!form) return;
    const name = form.name.trim();
    const replyText = form.replyText.trim();
    const keywords = form.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    if (!name || !replyText || keywords.length === 0) {
      setError('Completá nombre, al menos una palabra clave y el texto de respuesta.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (form.id) {
        const updated = await ApiService.updateBotRule(form.id, { name, keywords, replyText, isActive: form.isActive });
        setRules((prev) => prev.map((r) => (r.id === form.id ? updated : r)));
      } else {
        const created = await ApiService.createBotRule({ name, keywords, replyText, isActive: form.isActive });
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
      setTestResult(`Último mensaje: "${result.text}" — matcheó y se está preparando la respuesta.`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4" style={{ zIndex: 2147483647 }} onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-[420px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#9e1114] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <span className="font-bold text-sm">Editar flujo del chatbot</span>
          <button onClick={onClose} className="text-white/85 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3 overflow-y-auto text-xs">
          <div className="flex items-center justify-between text-slate-500 bg-slate-50 rounded-lg p-2.5 gap-2">
            <span>Cada bloque dispara con sus palabras clave y responde en el chat activo.</span>
            <button
              onClick={handleTest}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 shrink-0"
              title="Probar contra el último mensaje entrante visible"
            >
              <PlayCircle className="w-3.5 h-3.5" /> Probar
            </button>
          </div>

          {error && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">{error}</div>
          )}
          {testResult && (
            <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">{testResult}</div>
          )}

          {form ? (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold text-slate-500">Nombre</span>
                <input
                  className="border border-red-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Horario de atención"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold text-slate-500">Palabras clave (separadas por coma)</span>
                <input
                  className="border border-red-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  placeholder="hola, buenas, saludos"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold text-slate-500">Respuesta</span>
                <textarea
                  className="border border-red-300 rounded-md px-2.5 py-1.5 text-xs resize-none focus:outline-none"
                  rows={3}
                  value={form.replyText}
                  onChange={(e) => setForm({ ...form, replyText: e.target.value })}
                  placeholder="Texto que responde el bot cuando matchea"
                />
              </label>
              <label className="flex items-center gap-2 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Bloque activo
              </label>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setForm(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveForm}
                  disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 text-slate-400 py-3 justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Cargando bloques...
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-0.5">
              {rules.length === 0 && (
                <p className="text-[11px] text-slate-500 text-center py-3">Todavía no hay bloques cargados.</p>
              )}
              {rules.map((rule) => (
                <div key={rule.id} className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <b className="text-[13px] text-slate-800 truncate">{rule.name}</b>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEditForm(rule)} className="p-1 rounded-md hover:bg-slate-100 text-slate-500">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(rule)} className="p-1 rounded-md hover:bg-red-50 text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(rule)}
                        className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors ${rule.isActive ? 'bg-red-600 justify-end' : 'bg-slate-300 justify-start'}`}
                        title={rule.isActive ? 'Desactivar' : 'Activar'}
                      >
                        <span className="w-3.5 h-3.5 bg-white rounded-full shadow-md" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {rule.keywords.map((kw) => (
                      <span key={kw} className="text-[9.5px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <p className="text-slate-500 line-clamp-2">{rule.replyText}</p>
                </div>
              ))}
            </div>
          )}

          {!form && (
            <button
              onClick={openNewForm}
              className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar bloque
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-3 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BotFlowModal;

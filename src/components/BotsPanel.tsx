import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader, AlertCircle, Send, CheckCircle2, Sparkles } from 'lucide-react';

type RuleAction = 'STATIC_REPLY' | 'CALL_AI' | 'TACTICA_STOCK_LOOKUP' | 'CREATE_SUPPORT_TICKET';

interface KeywordRule {
  id: string;
  name: string;
  keywords: string[];
  replyText: string;
  action: RuleAction;
  isActive: boolean;
  createdAt: string;
}

interface TestExchange {
  message: string;
  reply: string;
  source: 'KEYWORD_RULE' | 'AI_AGENT';
}

interface FormData {
  name: string;
  keywords: string;
  replyText: string;
  action: RuleAction;
  isActive: boolean;
}

const defaultFormData: FormData = {
  name: '',
  keywords: '',
  replyText: '',
  action: 'STATIC_REPLY',
  isActive: true,
};

export default function BotsPanel() {
  const [rules, setRules] = useState<KeywordRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testHistory, setTestHistory] = useState<TestExchange[]>([]);

  // Fetch rules on mount
  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bot/rules');
      if (!response.ok) throw new Error('Failed to fetch rules');
      const data = await response.json();
      setRules(data);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (rule?: KeywordRule) => {
    if (rule) {
      setEditingRuleId(rule.id);
      setFormData({
        name: rule.name,
        keywords: rule.keywords.join(', '),
        replyText: rule.replyText,
        action: rule.action,
        isActive: rule.isActive,
      });
    } else {
      setEditingRuleId(null);
      setFormData(defaultFormData);
    }
    setFormError('');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRuleId(null);
    setFormData(defaultFormData);
    setFormError('');
  };

  const handleFormChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const keywordsArray = formData.keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      if (keywordsArray.length === 0) {
        setFormError('Por favor ingresa al menos una palabra clave');
        setSubmitting(false);
        return;
      }

      const payload = {
        name: formData.name,
        keywords: keywordsArray,
        replyText: formData.replyText,
        action: formData.action,
        isActive: formData.isActive,
      };

      const url = editingRuleId ? `/api/bot/rules/${editingRuleId}` : '/api/bot/rules';
      const method = editingRuleId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar la regla');
      }

      const savedRule = await response.json();

      if (editingRuleId) {
        // Update existing rule in list
        setRules((prev) => prev.map((r) => (r.id === editingRuleId ? savedRule : r)));
      } else {
        // Add new rule to list
        setRules((prev) => [savedRule, ...prev]);
      }

      handleCloseForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (rule: KeywordRule) => {
    const newIsActive = !rule.isActive;
    // Optimistic update
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, isActive: newIsActive } : r))
    );

    try {
      const response = await fetch(`/api/bot/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newIsActive }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar');
      }
    } catch (error) {
      console.error('Error toggling active:', error);
      // Revert optimistic update
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, isActive: !newIsActive } : r))
      );
    }
  };

  const handleDeleteRule = async (rule: KeywordRule) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la regla "${rule.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/bot/rules/${rule.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar');
      }

      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Error al eliminar la regla');
    }
  };

  const handleTestBot = async () => {
    if (!testInput.trim()) return;

    setTestLoading(true);
    try {
      const response = await fetch('/api/bot/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testInput }),
      });

      if (!response.ok) throw new Error('Error en la solicitud');

      const data = await response.json();
      setTestHistory((prev) => [
        {
          message: testInput,
          reply: data.replyText,
          source: data.source,
        },
        ...prev,
      ]);
      setTestInput('');
    } catch (error) {
      console.error('Error testing bot:', error);
      alert('Error al probar el bot');
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTestBot();
    }
  };

  const actionOptions: { value: RuleAction; label: string }[] = [
    { value: 'STATIC_REPLY', label: 'Respuesta Fija' },
    { value: 'CALL_AI', label: 'Llamar IA' },
    { value: 'TACTICA_STOCK_LOOKUP', label: 'Búsqueda Stock Táctica' },
    { value: 'CREATE_SUPPORT_TICKET', label: 'Crear Ticket de Soporte' },
  ];

  const getActionLabel = (action: RuleAction): string => {
    return actionOptions.find((opt) => opt.value === action)?.label || action;
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Reglas por palabra clave */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Reglas por palabra clave</h3>
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nueva regla
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-6 glass-panel rounded-2xl p-6 border border-cyan-500/20">
            <h4 className="text-lg font-semibold text-white mb-4">
              {editingRuleId ? 'Editar regla' : 'Crear nueva regla'}
            </h4>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre de la regla
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="ej: Preguntas sobre devoluciones"
                  className="w-full px-4 py-2 glass-input text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  required
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Palabras clave (separadas por comas)
                </label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => handleFormChange('keywords', e.target.value)}
                  placeholder="ej: devolver, devuelvo, devolución"
                  className="w-full px-4 py-2 glass-input text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  required
                />
              </div>

              {/* Reply Text */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Texto de respuesta
                </label>
                <textarea
                  value={formData.replyText}
                  onChange={(e) => handleFormChange('replyText', e.target.value)}
                  placeholder="Escribe la respuesta automática..."
                  rows={3}
                  className="w-full px-4 py-2 glass-input text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                  required
                />
              </div>

              {/* Action */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tipo de acción
                </label>
                <select
                  value={formData.action}
                  onChange={(e) => handleFormChange('action', e.target.value)}
                  className="w-full px-4 py-2 glass-input text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 bg-slate-900/50"
                >
                  {actionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Por ahora solo "Respuesta Fija" está conectada al motor del bot; las demás opciones son
                  para futuras integraciones con Táctica ERP.
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleFormChange('isActive', e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer accent-cyan-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Activar esta regla
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 transition-all active:scale-95"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" /> Guardando...
                    </span>
                  ) : editingRuleId ? (
                    'Actualizar regla'
                  ) : (
                    'Crear regla'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 glass-input text-white font-semibold rounded-xl hover:bg-white/10 disabled:opacity-50 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rules List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : rules.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <p className="text-slate-400">No hay reglas creadas. ¡Crea una para empezar!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="glass-card rounded-2xl p-5 border border-white/10 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-white text-lg">{rule.name}</h4>
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
                          rule.isActive
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}
                      >
                        {rule.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    {/* Keywords Pills */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {rule.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-md"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>

                    {/* Reply Preview */}
                    <p className="text-sm text-slate-300 mb-3 line-clamp-2">{rule.replyText}</p>

                    {/* Action Badge */}
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md">
                        {getActionLabel(rule.action)}
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-col gap-2">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${
                        rule.isActive
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                          : 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30'
                      }`}
                    >
                      {rule.isActive ? 'Activa' : 'Inactiva'}
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenForm(rule)}
                      className="flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-medium transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteRule(rule)}
                      className="flex items-center justify-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-medium transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Probar el bot */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">Probar el bot</h3>

        {/* Test Input */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            onKeyPress={handleTestKeyPress}
            placeholder="Escribe un mensaje para probar..."
            disabled={testLoading}
            className="flex-1 px-4 py-3 glass-input text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
          />
          <button
            onClick={handleTestBot}
            disabled={testLoading || !testInput.trim()}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
          >
            {testLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Probar
          </button>
        </div>

        {/* Test History */}
        {testHistory.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Historial de pruebas (más recientes primero):</p>
            {testHistory.map((exchange, idx) => (
              <div key={idx} className="space-y-2 p-4 bg-white/5 rounded-xl border border-white/5">
                {/* Message */}
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-1">Tu mensaje:</p>
                    <p className="text-sm text-white bg-slate-900/50 rounded-lg p-2">{exchange.message}</p>
                  </div>
                </div>

                {/* Reply */}
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-slate-400">Respuesta del bot:</p>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                          exchange.source === 'KEYWORD_RULE'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {exchange.source === 'KEYWORD_RULE' ? 'Regla por palabra clave' : 'Agente IA'}
                      </span>
                    </div>
                    <p className="text-sm text-white bg-cyan-500/10 rounded-lg p-2 border border-cyan-500/20">
                      {exchange.reply}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

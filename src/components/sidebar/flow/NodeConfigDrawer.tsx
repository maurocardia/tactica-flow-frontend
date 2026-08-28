// src/components/sidebar/flow/NodeConfigDrawer.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Save,
  Clock,
  ListFilter,
  MessageSquare,
  Zap,
  Bot,
  UserCheck
} from 'lucide-react';
import { BotFlowNode, FlowNodeOption, NodeType } from '@/types/bot';
import { PALETTE_BLOCKS } from './FlowPalette';

interface NodeConfigDrawerProps {
  node: BotFlowNode | null;
  allNodes: BotFlowNode[];
  onClose: () => void;
  onSave: (updatedNode: BotFlowNode) => void;
}

export const NodeConfigDrawer: React.FC<NodeConfigDrawerProps> = ({
  node,
  allNodes,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<NodeType>('STATIC_REPLY');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [replyText, setReplyText] = useState('');
  const [options, setOptions] = useState<FlowNodeOption[]>([]);
  const [delaySeconds, setDelaySeconds] = useState(2);

  useEffect(() => {
    if (node) {
      setName(node.data.name || node.title || '');
      setType(node.type);
      setKeywords(node.data.keywords || []);
      setReplyText(node.data.replyText || '');
      setOptions(node.data.options || []);
      setDelaySeconds(node.data.delaySeconds || 2);
    }
  }, [node]);

  if (!node) return null;

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleAddOption = () => {
    const nextNum = options.length + 1;
    const newOption: FlowNodeOption = {
      id: `opt_${Date.now()}_${nextNum}`,
      label: `${nextNum}. Opción ${nextNum}`,
      keyword: `${nextNum}`,
      targetNodeId: null
    };
    setOptions([...options, newOption]);
  };

  const handleUpdateOption = (index: number, field: keyof FlowNodeOption, value: any) => {
    setOptions(
      options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
    );
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const insertVariable = (varName: string) => {
    setReplyText((prev) => `${prev} {${varName}}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: BotFlowNode = {
      ...node,
      type,
      title: name.trim() || node.title,
      data: {
        ...node.data,
        name: name.trim(),
        keywords,
        replyText: replyText.trim(),
        options: type === 'OPTIONS_MENU' ? options : undefined,
        delaySeconds: type === 'DELAY' ? delaySeconds : undefined
      }
    };
    onSave(updated);
  };

  const isTrigger = type === 'TRIGGER';

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200 select-none">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
        <div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Configuración del Bloque
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            ID: {node.id}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
        {/* Nombre del bloque */}
        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Nombre del bloque:
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Saludo Inicial / Catálogo"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-hidden"
          />
        </div>

        {/* Tipo de bloque */}
        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Tipo de bloque:
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as NodeType)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-hidden cursor-pointer"
          >
            {PALETTE_BLOCKS.map((b) => (
              <option key={b.type} value={b.type}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        {/* Palabras Clave (para Trigger o para cualquier nodo) */}
        {(isTrigger || type === 'STATIC_REPLY' || type === 'OPTIONS_MENU') && (
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Palabras clave activadoras:
            </label>
            <div className="flex gap-1.5 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                placeholder="Escribe y presiona Enter (ej: hola)"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              {keywords.map((kw, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-medium text-[11px]"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(i)}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {keywords.length === 0 && (
                <span className="text-slate-400 italic text-[11px]">
                  Sin palabras clave. Se activará cuando otro bloque apunte a él.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Mensaje de Respuesta */}
        {type !== 'DELAY' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Texto del mensaje:
              </label>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Variables:</span>
                <button
                  type="button"
                  onClick={() => insertVariable('nombre')}
                  className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold hover:bg-purple-100 cursor-pointer"
                >
                  {'{nombre}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('empresa')}
                  className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold hover:bg-purple-100 cursor-pointer"
                >
                  {'{empresa}'}
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Escribe la respuesta que enviará el bot..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-normal focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-hidden resize-none"
            />
          </div>
        )}

        {/* Configuración de Opciones (si es OPTIONS_MENU) */}
        {type === 'OPTIONS_MENU' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Opciones del Menú (Botones):
              </label>
              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Opción
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {options.map((opt, i) => (
                <div
                  key={opt.id || i}
                  className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => handleUpdateOption(i, 'label', e.target.value)}
                      placeholder="Texto de la opción (ej: 1. Consultar Precios)"
                      className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(i)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500 shrink-0">Atajo / Tecla:</span>
                    <input
                      type="text"
                      value={opt.keyword}
                      onChange={(e) => handleUpdateOption(i, 'keyword', e.target.value)}
                      placeholder="ej: 1"
                      className="w-16 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delay en segundos */}
        {type === 'DELAY' && (
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Tiempo de espera (segundos):
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 2)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Pausa la respuesta para simular que un operador está tipeando.
            </p>
          </div>
        )}
      </form>

      {/* Footer */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md cursor-pointer transition-all"
        >
          <Save className="w-3.5 h-3.5" /> Guardar Cambios
        </button>
      </div>
    </div>
  );
};

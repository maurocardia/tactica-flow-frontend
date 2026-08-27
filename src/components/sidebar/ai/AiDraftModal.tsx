import React, { useState } from 'react';
import { Send, Loader2, Plus, X, RefreshCw, Check, AlertTriangle, BookOpen } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { DOMService } from '@/services/dom.service';
import { ApiService } from '@/services/api.service';
import { VarBar } from '../templates/VarBar';

interface AiDraftModalProps {
  onClose: () => void;
  contactName: string;
}

type Tone = 'formal' | 'cordial' | 'directo';

const DEFAULT_INSTRUCTIONS = [
  'Dar bienvenida y ofrecer catálogo de productos',
  'Consultar si precisa presupuesto formal',
  'Pedir CUIT y razón social para facturación',
  'Agradecer compra y solicitar confirmación de entrega',
  'Resolver duda sobre estado de pedido o ticket'
];

export const AiDraftModal: React.FC<AiDraftModalProps> = ({ onClose, contactName }) => {
  const [tone, setTone] = useState<Tone>('cordial');
  const [instructionChips, setInstructionChips] = useState<string[]>(DEFAULT_INSTRUCTIONS);
  const [selectedInstruction, setSelectedInstruction] = useState<string>('');
  const [newChipInput, setNewChipInput] = useState('');
  const [isAddingChip, setIsAddingChip] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [draft, setDraft] = useState('');
  const [foundInKb, setFoundInKb] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inserted, setInserted] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setInserted(false);
    setFoundInKb(null);

    try {
      const messages = DOMService.getVisibleMessages();
      const conversationText = messages.length > 0
        ? messages.map((m) => `${m.sender === 'them' ? 'Cliente' : 'Asesor'}: ${m.text}`).join('\n')
        : '(Sin mensajes previos en el chat abierto)';

      const res = await ApiService.draftReply({
        conversationText,
        contactName,
        tone,
        instruction: selectedInstruction,
        userPrompt: userPrompt.trim()
      });

      if (res?.draft) {
        // Reemplazo básico de variables automáticas
        let formatted = res.draft
          .replace(/{nombre}/gi, contactName || 'Estimado/a')
          .replace(/{empresa}/gi, 'su empresa');
        setDraft(formatted);
        setFoundInKb(res.foundInKb ?? false);
      } else {
        setError('No se pudo obtener una respuesta de la IA.');
      }
    } catch (err: any) {
      console.error('[AiDraftModal] Error:', err);
      setError(err.message || 'Error al conectar con el servicio de IA');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (!draft) return;
    const ok = DOMService.insertMessage(draft);
    if (ok) {
      setInserted(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      setError('No se encontró el cuadro de texto de WhatsApp Web para insertar.');
    }
  };

  const handleAddChip = () => {
    if (!newChipInput.trim()) return;
    setInstructionChips([...instructionChips, newChipInput.trim()]);
    setSelectedInstruction(newChipInput.trim());
    setNewChipInput('');
    setIsAddingChip(false);
  };

  const handleRemoveChip = (chip: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setInstructionChips(instructionChips.filter((c) => c !== chip));
    if (selectedInstruction === chip) setSelectedInstruction('');
  };

  const insertVariable = (variable: string) => {
    setDraft((prev) => `${prev} ${variable}`.trim());
  };

  return (
    <Modal
      title="Redactar respuesta con IA"
      onClose={onClose}
      headerColor="bg-purple-600"
      maxWidth="max-w-[480px]"
      footer={
        <>
          <button
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {draft ? 'Regenerar' : 'Generar respuesta'}
          </button>
          <button
            onClick={handleInsert}
            disabled={!draft || loading || inserted}
            className={`flex items-center gap-1.5 font-semibold text-xs px-4 py-2 rounded-lg transition-colors ${
              inserted
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white'
            }`}
          >
            {inserted ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            {inserted ? '¡Insertado en chat!' : 'Insertar en el chat'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5 text-xs">
        {/* Selector de Tono */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 mb-1.5 block uppercase tracking-wider">
            Tono de la respuesta
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'formal', label: 'Formal', desc: 'Trato de usted, formal y ejecutivo' },
              { id: 'cordial', label: 'Cordial', desc: 'Cálido, empático y resolutivo' },
              { id: 'directo', label: 'Directo', desc: 'Comercial directo sin rodeos' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id as Tone)}
                className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                  tone === t.id
                    ? 'border-purple-500 bg-purple-50/80 text-purple-900 shadow-sm'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <span className="font-bold text-xs">{t.label}</span>
                <span className="text-[10px] text-slate-500 leading-tight">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chips de Instrucciones Rápidas */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Objetivo / Instrucción rápida
            </label>
            {!isAddingChip && (
              <button
                type="button"
                onClick={() => setIsAddingChip(true)}
                className="text-[10.5px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Agregar objetivo
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-0.5">
            {instructionChips.map((chip) => {
              const active = selectedInstruction === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setSelectedInstruction(active ? '' : chip)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                    active
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <span>{chip}</span>
                  <span
                    onClick={(e) => handleRemoveChip(chip, e)}
                    className="hover:opacity-75 p-0.5 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </span>
                </button>
              );
            })}
          </div>

          {isAddingChip && (
            <div className="flex items-center gap-1.5 mt-2">
              <input
                type="text"
                value={newChipInput}
                onChange={(e) => setNewChipInput(e.target.value)}
                placeholder="Escribe un nuevo objetivo..."
                className="flex-1 border border-purple-300 rounded-md px-2.5 py-1 text-xs focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddChip();
                }}
              />
              <button
                type="button"
                onClick={handleAddChip}
                className="bg-purple-600 text-white font-semibold text-xs px-2.5 py-1 rounded-md"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setIsAddingChip(false)}
                className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Indicación libre del asesor */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 mb-1 block uppercase tracking-wider">
            Detalle adicional o contexto específico
          </label>
          <input
            type="text"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Ej: 'Avisale que el presupuesto 4022 ya tiene 10% de descuento incluido'"
            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-400"
          />
        </div>

        {/* Área de resultado y variables */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Propuesta redactada por la IA
            </label>
            <span className="text-[10px] text-slate-500">Haz clic en variables para insertar</span>
          </div>

          <div className="mb-2">
            <VarBar onInsert={insertVariable} />
          </div>

          {error && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 mb-2">
              {error}
            </div>
          )}

          {draft && foundInKb === true && (
            <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold mb-2">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Información respaldada por la Base de Conocimiento oficial de tu empresa.</span>
            </div>
          )}

          {draft && foundInKb === false && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block text-amber-950 dark:text-amber-100">No encontrado en la Base de Conocimiento</strong>
                No se encontró información oficial sobre este tema en tus documentos. La IA redactó una respuesta general/cordial basada en el contexto del chat. <strong>Por favor revisá los datos antes de enviar</strong>.
              </div>
            </div>
          )}

          <textarea
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              loading
                ? 'Generando propuesta contextual con IA...'
                : 'Haz clic en "Generar respuesta" para que la IA redacte un borrador analizando el chat activo...'
            }
            disabled={loading}
            className="w-full border border-slate-300 focus:border-purple-500 focus:outline-none rounded-lg p-2.5 text-xs leading-relaxed resize-none bg-slate-50/50 [color-scheme:light] text-slate-800"
          />
        </div>
      </div>
    </Modal>
  );
};

export default AiDraftModal;

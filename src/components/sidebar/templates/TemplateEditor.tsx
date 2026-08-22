import React, { useState } from 'react';
import { MessageTemplate, TemplateKind } from '@/types/template';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { VarBar } from './VarBar';

interface Props {
  initial: MessageTemplate | null;
  onSave: (tpl: Omit<MessageTemplate, 'id'>) => void;
  onCancel: () => void;
}

export const TemplateEditor: React.FC<Props> = ({ initial, onSave, onCancel }) => {
  const [name, setName] = useState(initial?.name ?? '/');
  const [kind, setKind] = useState<TemplateKind>(initial?.kind ?? 'fijo');
  const [text, setText] = useState(initial?.text ?? '');

  const insertVar = (v: string) => setText((t) => `${t} ${v}`.trim());

  const save = () => {
    if (!name.trim() || !text.trim()) return;
    onSave({ name: name.trim(), kind, text: text.trim() });
  };

  return (
    <div className="flex flex-col gap-2.5 border border-slate-200 rounded-lg p-2.5">
      <Field label="Nombre (estilo comando)">
        <input className={fieldInputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="/saludo" />
      </Field>
      <div className="flex items-center gap-4 text-[11.5px]">
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={kind === 'fijo'} onChange={() => setKind('fijo')} /> Fijo
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={kind === 'ia'} onChange={() => setKind('ia')} /> ✨ Generado con IA
        </label>
      </div>
      <VarBar onInsert={insertVar} />
      <textarea
        className="w-full min-h-[100px] resize-y text-xs leading-relaxed bg-purple-50/60 border border-purple-100 rounded-lg p-2.5"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={kind === 'fijo' ? 'Texto fijo del mensaje...' : 'Instrucción para que la IA redacte el mensaje...'}
      />
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 rounded-lg">
          Cancelar
        </button>
        <button onClick={save} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2 rounded-lg">
          Guardar
        </button>
      </div>
    </div>
  );
};

export default TemplateEditor;

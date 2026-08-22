import React from 'react';
import { Pencil, Trash2, PlayCircle } from 'lucide-react';
import { MessageTemplate } from '@/types/template';

interface Props {
  templates: MessageTemplate[];
  onUse: (tpl: MessageTemplate) => void;
  onEdit: (tpl: MessageTemplate) => void;
  onDelete: (id: string) => void;
}

export const TemplateList: React.FC<Props> = ({ templates, onUse, onEdit, onDelete }) => (
  <div className="flex flex-col gap-2">
    {templates.map((tpl) => (
      <div key={tpl.id} className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <b className="text-[13px] text-slate-800 truncate">{tpl.name}</b>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                tpl.kind === 'ia' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tpl.kind === 'ia' ? '✨ IA' : 'Fijo'}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onUse(tpl)} className="p-1 rounded-md hover:bg-slate-100 text-slate-500" title="Usar">
              <PlayCircle className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onEdit(tpl)} className="p-1 rounded-md hover:bg-slate-100 text-slate-500" title="Editar">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(tpl.id)} className="p-1 rounded-md hover:bg-red-50 text-red-500" title="Eliminar">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-slate-500 line-clamp-2">{tpl.text}</p>
      </div>
    ))}
  </div>
);

export default TemplateList;

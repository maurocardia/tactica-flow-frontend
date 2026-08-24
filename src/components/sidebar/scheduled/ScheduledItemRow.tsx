import React from 'react';
import { Trash2, Pencil, Clock, Repeat } from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';

interface Props {
  icon: 'clock' | 'repeat';
  title: string;
  meta: string;
  active: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

export const ScheduledItemRow: React.FC<Props> = ({ icon, title, meta, active, onToggle, onEdit }) => (
  <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-2.5">
    {icon === 'clock' ? <Clock className="w-4 h-4 text-slate-400 shrink-0" /> : <Repeat className="w-4 h-4 text-slate-400 shrink-0" />}
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-slate-700 truncate">{title}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {active ? 'Activo' : 'Pausado'}
        </span>
      </div>
      <p className="text-[10.5px] text-slate-500 truncate">{meta}</p>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      <Toggle size="sm" checked={active} onChange={onToggle} />
      <button onClick={onEdit} className="p-1 rounded-md hover:bg-slate-100 text-slate-500">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button className="p-1 rounded-md text-slate-300 cursor-default" title="Eliminar (próximamente)">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

export default ScheduledItemRow;

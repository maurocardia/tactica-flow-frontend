import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MessageTemplate } from '@/types/template';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { useAppState } from '@/state/AppStateContext';
import { useSimulatedAction } from '@/hooks/useSimulatedAction';
import { simulate } from '@/services/simulation.service';

type FilterType = 'actual' | 'etiqueta' | 'filtro' | 'grupo';

const SAVED_FILTERS = ['Clientes activos', 'Presupuestos pendientes'];
const GROUPS = ['Grupo · Compras', 'Grupo · Soporte VIP'];
const REACH: Record<string, number> = {
  'Clientes activos': 128,
  'Presupuestos pendientes': 54,
  'Grupo · Compras': 86,
  'Grupo · Soporte VIP': 32,
};

export const SegmentSender: React.FC<{ templates: MessageTemplate[] }> = ({ templates }) => {
  const { tags } = useAppState();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [filterType, setFilterType] = useState<FilterType>('etiqueta');
  const [filterValue, setFilterValue] = useState(tags[0] ?? '');
  const { status, run } = useSimulatedAction();

  const reach = useMemo(() => {
    if (filterType === 'actual') return 1;
    return REACH[filterValue] ?? Math.max(3, filterValue.length * 4);
  }, [filterType, filterValue]);

  const options = filterType === 'etiqueta' ? tags : filterType === 'filtro' ? SAVED_FILTERS : filterType === 'grupo' ? GROUPS : [];

  const send = () => run(() => simulate(undefined));

  return (
    <div className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2">
      <h4 className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Envío segmentado</h4>
      <Field label="Plantilla">
        <select className={fieldInputClass} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Filtrar destinatarios por">
        <select
          className={fieldInputClass}
          value={filterType}
          onChange={(e) => {
            const ft = e.target.value as FilterType;
            setFilterType(ft);
            const opts = ft === 'etiqueta' ? tags : ft === 'filtro' ? SAVED_FILTERS : ft === 'grupo' ? GROUPS : [];
            setFilterValue(opts[0] ?? '');
          }}
        >
          <option value="actual">Contacto actual</option>
          <option value="etiqueta">Etiqueta</option>
          <option value="filtro">Filtro guardado de TACTICA</option>
          <option value="grupo">Grupo de contactos</option>
        </select>
      </Field>
      {filterType !== 'actual' && (
        <Field label="Valor">
          <select className={fieldInputClass} value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
      )}
      <p className="text-[11px] text-slate-500">Alcance estimado: <b className="text-slate-700">{reach} contactos</b></p>
      <button
        onClick={send}
        disabled={!templateId || status === 'loading'}
        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"
      >
        {status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {status === 'done' ? 'Envío en curso ✓' : 'Enviar a segmento'}
      </button>
      <p className="text-[10px] text-slate-400">
        Los envíos masivos requieren plantillas aprobadas por Meta (categorías Marketing / Utility / Authentication).
      </p>
    </div>
  );
};

export default SegmentSender;

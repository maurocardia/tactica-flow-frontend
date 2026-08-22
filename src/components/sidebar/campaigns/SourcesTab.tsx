import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SOURCES } from './sourcesData';
import { SourceCard } from './SourceCard';
import { ResultsChecklist } from './ResultsChecklist';
import { fieldInputClass, Field } from '@/components/ui/Field';
import { useAppState } from '@/state/AppStateContext';
import { useSimulatedAction } from '@/hooks/useSimulatedAction';
import { simulate } from '@/services/simulation.service';
import { CHANNELS } from '@/config/channels';
import { ChannelId } from '@/types/account';

function parseCsv(raw: string): { name: string; channels: ChannelId[] }[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      const name = parts[0] || 'Sin nombre';
      const channels: ChannelId[] = [];
      const joined = parts.join(' ');
      if (/@/.test(joined)) channels.push('gm');
      if (/linkedin\.com/.test(joined)) channels.push('li');
      if (/\d{6,}/.test(joined)) channels.push('wa');
      return { name, channels: channels.length ? channels : ['wa'] };
    });
}

export const SourcesTab: React.FC = () => {
  const { leads, setLeads } = useAppState();
  const [activeSourceId, setActiveSourceId] = useState(SOURCES[0].id);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [csvText, setCsvText] = useState('');
  const { status, run } = useSimulatedAction();

  const activeSource = SOURCES.find((s) => s.id === activeSourceId)!;
  const csvResults = activeSource.isCsv ? parseCsv(csvText) : [];
  const results = activeSource.isCsv ? csvResults.map((r) => ({ name: r.name, channels: r.channels })) : activeSource.results;

  const selectSource = (id: typeof activeSourceId) => {
    setActiveSourceId(id);
    setFilterValues({});
    setChecked({});
  };

  const collect = () =>
    run(async () => {
      await simulate(undefined, { minMs: 400, maxMs: 800 });
      const picked = results.filter((_, i) => checked[i]);
      setLeads((prev) => [
        ...picked.map((r, i) => ({
          id: `lead-${Date.now()}-${i}`,
          name: r.name,
          company: (r as any).company,
          channels: r.channels,
          source: activeSource.label,
        })),
        ...prev,
      ]);
      setChecked({});
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-1.5">
        {SOURCES.map((s) => (
          <SourceCard key={s.id} source={s} active={s.id === activeSourceId} onClick={() => selectSource(s.id)} />
        ))}
      </div>

      {activeSource.isCsv ? (
        <Field label="Pegar lista (nombre, email o teléfono, uno por línea)">
          <textarea
            className={fieldInputClass}
            rows={4}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'Juan Pérez, juan@empresa.com\nMaría Gómez, +54 9 11 5555-2233'}
          />
        </Field>
      ) : (
        activeSource.filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeSource.filters.map((f) => (
              <div key={f.key} className="flex-1 min-w-[120px]">
                <Field label={f.label}>
                  {f.type === 'select' ? (
                    <select
                      className={fieldInputClass}
                      value={filterValues[f.key] ?? ''}
                      onChange={(e) => setFilterValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    >
                      <option value="">Todos</option>
                      {f.options?.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={fieldInputClass}
                      value={filterValues[f.key] ?? ''}
                      onChange={(e) => setFilterValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>
        )
      )}

      {results.length > 0 && (
        <>
          <ResultsChecklist results={results} checked={checked} onToggle={(i) => setChecked((c) => ({ ...c, [i]: !c[i] }))} />
          <button
            onClick={collect}
            disabled={status === 'loading' || !Object.values(checked).some(Boolean)}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5"
          >
            {status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Recolectar seleccionados
          </button>
        </>
      )}

      {leads.length > 0 && (
        <div>
          <h4 className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Leads recolectados ({leads.length})</h4>
          <div className="flex flex-col divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-[160px] overflow-y-auto">
            {leads.map((l) => (
              <div key={l.id} className="flex items-center gap-2 px-2.5 py-2 text-[11.5px]">
                <span className="flex-1 min-w-0 truncate font-semibold text-slate-700">{l.name}</span>
                <span className="flex gap-1">
                  {l.channels.map((c) => (
                    <span key={c} className={`text-[9px] font-bold px-1.5 rounded ${CHANNELS[c].color}`}>{CHANNELS[c].shortLabel}</span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SourcesTab;

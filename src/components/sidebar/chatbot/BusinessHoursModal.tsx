import React, { useState } from 'react';
import { Loader2, Plus, X, Copy } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { fieldInputClass } from '@/components/ui/Field';
import { ApiService } from '@/services/api.service';
import { useAuth } from '@/state/AuthContext';
import { DayKey, TimeRange, WeeklySchedule } from '@/types/auth';

// Horario de atención del bot: fuera de estos días y tramos el bot no responde (ver
// BusinessHoursService en el backend, PUT /api/whatsapp/business-hours). Se guarda con "Guardar".
const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
];
const MAX_RANGES = 4;
const OFF_HOURS_MAX_LEN = 1500;
const OFF_HOURS_PLACEHOLDER =
  'Hola {nombre}, en este momento estamos fuera de nuestro horario de atención. Te respondemos apenas volvamos.';
const TIMEZONES = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (Buenos Aires)' },
  { value: 'America/Bogota', label: 'Colombia (Bogotá)' },
  { value: 'America/Mexico_City', label: 'México (Ciudad de México)' },
  { value: 'America/Santiago', label: 'Chile (Santiago)' },
  { value: 'America/Lima', label: 'Perú (Lima)' },
  { value: 'America/Montevideo', label: 'Uruguay (Montevideo)' },
  { value: 'America/Asuncion', label: 'Paraguay (Asunción)' },
  { value: 'America/Caracas', label: 'Venezuela (Caracas)' },
  { value: 'America/Guayaquil', label: 'Ecuador (Guayaquil)' },
  { value: 'America/La_Paz', label: 'Bolivia (La Paz)' },
  { value: 'America/Sao_Paulo', label: 'Brasil (São Paulo)' },
  { value: 'Europe/Madrid', label: 'España (Madrid)' },
];
// Lo que se muestra la primera vez (horario sin cargar): el ejemplo típico L-V 9-13 y 14-18.
const DEFAULT_SCHEDULE: WeeklySchedule = {
  mon: [{ from: '09:00', to: '13:00' }, { from: '14:00', to: '18:00' }],
  tue: [{ from: '09:00', to: '13:00' }, { from: '14:00', to: '18:00' }],
  wed: [{ from: '09:00', to: '13:00' }, { from: '14:00', to: '18:00' }],
  thu: [{ from: '09:00', to: '13:00' }, { from: '14:00', to: '18:00' }],
  fri: [{ from: '09:00', to: '13:00' }, { from: '14:00', to: '18:00' }],
};

const rangeError = (r: TimeRange) => (!r.from || !r.to ? 'Completá las dos horas' : r.from >= r.to ? '"Desde" tiene que ser antes que "hasta"' : null);

export const BusinessHoursModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, updateUser } = useAuth();
  const hasSaved = !!user?.businessHours && Object.keys(user.businessHours).length > 0;
  const [enabled, setEnabled] = useState<boolean>(user?.businessHoursEnabled ?? false);
  const [timezone, setTimezone] = useState<string>(user?.businessHoursTimezone || TIMEZONES[0].value);
  const [schedule, setSchedule] = useState<WeeklySchedule>(hasSaved ? user!.businessHours : DEFAULT_SCHEDULE);
  const [offEnabled, setOffEnabled] = useState<boolean>(user?.offHoursMessageEnabled ?? false);
  const [offText, setOffText] = useState<string>(user?.offHoursMessageText ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ranges = (day: DayKey) => schedule[day] ?? [];
  const setRanges = (day: DayKey, next: TimeRange[]) => setSchedule((s) => ({ ...s, [day]: next }));
  const toggleDay = (day: DayKey) =>
    setRanges(day, ranges(day).length > 0 ? [] : [{ from: '09:00', to: '18:00' }]);
  const copyMonday = () => {
    const mon = ranges('mon');
    setSchedule(Object.fromEntries(DAYS.map((d) => [d.key, mon.map((r) => ({ ...r }))])) as WeeklySchedule);
  };

  const invalid = DAYS.some((d) => ranges(d.key).some((r) => rangeError(r) !== null));
  const timezoneOptions = TIMEZONES.some((t) => t.value === timezone) ? TIMEZONES : [{ value: timezone, label: timezone }, ...TIMEZONES];

  const save = async () => {
    if (invalid || !user) return;
    setSaving(true);
    setError(null);
    try {
      const result = await ApiService.setBusinessHours({
        enabled,
        schedule,
        timezone,
        offHoursEnabled: offEnabled,
        offHoursText: offText.trim(),
      });
      updateUser(result);
      onClose();
    } catch (err: any) {
      console.error('[BusinessHoursModal] No se pudo guardar el horario:', err);
      setError(err?.message || 'No se pudo guardar el horario.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Horario de atención"
      onClose={onClose}
      headerColor="bg-[#9e1114]"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            onClick={onClose}
            className="text-[11px] font-bold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || invalid}
            className="flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 rounded-lg bg-[#9e1114] text-white hover:bg-[#800d10] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Guardar
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11.5px] font-bold text-slate-800 dark:text-slate-200">Usar horario</span>
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
              {enabled ? 'El bot solo responde dentro de estos días y horas.' : 'Apagado: el bot responde las 24 horas.'}
            </span>
          </div>
          <Toggle size="sm" checked={enabled} onChange={setEnabled} />
        </div>

        <label className="flex flex-col gap-0.5">
          <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Zona horaria</span>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={fieldInputClass}>
            {timezoneOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-between">
          <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Días y tramos</span>
          <button
            onClick={copyMonday}
            title="Copiar los tramos del lunes a todos los días"
            className="flex items-center gap-1 text-[10.5px] font-bold text-[#9e1114] dark:text-red-400 border border-red-300 dark:border-red-900 rounded-lg px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
          >
            <Copy className="w-3 h-3" /> Copiar lunes a toda la semana
          </button>
        </div>

        <div className={`flex flex-col gap-1.5 transition-opacity ${enabled ? '' : 'opacity-50'}`}>
          {DAYS.map((d) => {
            const list = ranges(d.key);
            const open = list.length > 0;
            return (
              <div key={d.key} className="flex items-start gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2">
                <label className="flex items-center gap-1.5 w-[86px] shrink-0 pt-1.5 cursor-pointer">
                  <input type="checkbox" checked={open} onChange={() => toggleDay(d.key)} className="w-3.5 h-3.5 accent-[#9e1114]" />
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{d.label}</span>
                </label>
                <div className="flex-1 flex flex-col gap-1">
                  {!open && <span className="text-[10.5px] text-slate-500 dark:text-slate-400 pt-1.5">Cerrado: el bot no responde</span>}
                  {list.map((r, i) => {
                    const err = rangeError(r);
                    const update = (patch: Partial<TimeRange>) => setRanges(d.key, list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                    return (
                      <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="time"
                            aria-label={`${d.label}: desde`}
                            value={r.from}
                            onChange={(e) => update({ from: e.target.value })}
                            className={`${fieldInputClass} !w-[92px] !py-1 ${err ? '!border-red-500' : ''}`}
                          />
                          <span className="text-[10.5px] text-slate-500">a</span>
                          <input
                            type="time"
                            aria-label={`${d.label}: hasta`}
                            value={r.to}
                            onChange={(e) => update({ to: e.target.value })}
                            className={`${fieldInputClass} !w-[92px] !py-1 ${err ? '!border-red-500' : ''}`}
                          />
                          <button
                            onClick={() => setRanges(d.key, list.filter((_, j) => j !== i))}
                            aria-label="Quitar tramo"
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {err && <span className="text-[10px] font-semibold text-red-600">{err}</span>}
                      </div>
                    );
                  })}
                  {open && list.length < MAX_RANGES && (
                    <button
                      onClick={() => setRanges(d.key, [...list, { from: '15:00', to: '18:00' }])}
                      className="self-start flex items-center gap-0.5 text-[10.5px] font-bold text-sky-700 dark:text-sky-300 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Agregar tramo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-1.5 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Aviso fuera de horario</span>
            <Toggle size="sm" checked={offEnabled} onChange={setOffEnabled} />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            Si está prendido, al cliente que escribe fuera de horario le llega este aviso una sola vez (no en grupos). Usá{' '}
            <b>{'{nombre}'}</b> para su nombre. Vacío = texto por defecto.
          </span>
          {offEnabled && (
            <textarea
              rows={3}
              maxLength={OFF_HOURS_MAX_LEN}
              value={offText}
              onChange={(e) => setOffText(e.target.value)}
              placeholder={OFF_HOURS_PLACEHOLDER}
              className={`${fieldInputClass} resize-y`}
            />
          )}
        </div>

        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
          Fuera de horario siguen funcionando el puente con asesores, STOP, «Pausar bot», la parada de emergencia y los mensajes
          programados. Los mensajes que entren fuera de horario no se contestan después.
        </p>
        {error && <span className="text-[10.5px] font-semibold text-red-600">{error}</span>}
      </div>
    </Modal>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, RotateCcw, Headset, ChevronDown, Unlock, Settings } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { ApiService } from '@/services/api.service';
import { useAuth } from '@/state/AuthContext';
import { Advisor } from '@/types/advisor';
import { COUNTRY_CODES } from '@/config/countryCodes';

// 0 = "sin límite" (ver BotContactService.UNLIMITED_RESERVATION_MINUTES en el backend) — por eso
// el mínimo es 0 y no 1, y el checkbox "Sin límite" de abajo lo pone/saca de ese valor.
const RESERVATION_MINUTES_UNLIMITED = 0;
const RESERVATION_MINUTES_MIN = 1;
const RESERVATION_MINUTES_MAX = 1440; // 24 horas — mismo tope que valida el backend
const QUEUE_REMINDER_SECONDS_MIN = 5;
const QUEUE_REMINDER_SECONDS_MAX = 86400; // 24 horas — mismo tope que valida el backend
const RELAY_INACTIVITY_MINUTES_MIN = 1;
const RELAY_INACTIVITY_MINUTES_MAX = 1440;
const AI_PAUSE_AFTER_ADVISOR_MINUTES_MIN = 0;
const AI_PAUSE_AFTER_ADVISOR_MINUTES_MAX = 1440;
const DEFAULT_FINISH_KEYWORDS = 'FIN,LISTO';

const onlyDigits = (s: string) => s.replace(/[^0-9]/g, '');

// Detecta el código de país de un teléfono ya guardado probando el prefijo más largo que
// matchee primero — si no, un código corto (ej. "1") podría ganarle por casualidad a uno más
// específico de 2-3 dígitos que también empieza igual.
const SORTED_CODES = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
function detectCountryCode(phone: string): string {
  const digits = onlyDigits(phone);
  return SORTED_CODES.find((c) => digits.startsWith(c.code))?.code || COUNTRY_CODES[0].code;
}

interface FormState {
  name: string;
  phone: string; // solo la parte local, sin el código de país (ver countryCode)
  countryCode: string;
}
const EMPTY_FORM: FormState = { name: '', phone: '', countryCode: COUNTRY_CODES[0].code };

// Gestión de asesores humanos: a quién deriva el bot una conversación cuando decide que necesita
// intervención de una persona — ver ChatbotModule.tsx (botón "Asesores"). La derivación en sí
// (a qué asesor le toca, de forma equitativa) la resuelve el backend; acá solo se administra el
// padrón (alta/baja/edición) y se pueden resetear los contadores de derivaciones.
export const AdvisorManagerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, updateUser } = useAuth();
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Minutos que un cliente queda "reservado" para el mismo asesor antes de que el bot pueda
  // asignarle a otro (ver AdvisorService.getReservationMinutes en el backend) — se guarda al
  // perder el foco, mismo patrón que el delay humanizado en ChatbotModule.tsx. 0 = sin límite
  // (ver RESERVATION_MINUTES_UNLIMITED).
  const [reservationMinutes, setReservationMinutes] = useState<number>(user?.handoffReservationMinutes ?? 30);
  const [savingReservation, setSavingReservation] = useState(false);
  const reservationUnlimited = reservationMinutes === RESERVATION_MINUTES_UNLIMITED;

  // El valor de ANTES de marcar "Sin límite" — para volver a proponerlo si lo destildan, en vez
  // de dejar el input en 0 (que ahí sí es una duración inválida para editar a mano).
  const lastFiniteReservationRef = useRef(reservationMinutes || 30);

  const saveReservationMinutes = async (minutes: number) => {
    setReservationMinutes(minutes);
    setSavingReservation(true);
    try {
      const result = await ApiService.setHandoffReservationMinutes(minutes);
      updateUser({ handoffReservationMinutes: result.handoffReservationMinutes });
    } catch (err) {
      console.error('[AdvisorManagerModal] No se pudo guardar la duración de la reserva de asesor:', err);
      setError('No se pudo guardar la duración de la reserva de asesor.');
    } finally {
      setSavingReservation(false);
    }
  };

  const handleReservationMinutesBlur = () => {
    const clamped = Math.min(RESERVATION_MINUTES_MAX, Math.max(RESERVATION_MINUTES_MIN, Math.round(reservationMinutes) || 30));
    lastFiniteReservationRef.current = clamped;
    saveReservationMinutes(clamped);
  };

  const toggleReservationUnlimited = (unlimited: boolean) => {
    if (unlimited) {
      lastFiniteReservationRef.current = reservationMinutes || lastFiniteReservationRef.current;
      saveReservationMinutes(RESERVATION_MINUTES_UNLIMITED);
    } else {
      saveReservationMinutes(lastFiniteReservationRef.current);
    }
  };

  // Cada cuántos segundos un cliente en la cola de espera (sin asesor todavía) recibe un mensaje
  // con su posición actual — mismo patrón que reservationMinutes de arriba. En segundos (no
  // minutos) a pedido del usuario, para poder avisar más seguido que una vez por minuto.
  const [queueReminderSeconds, setQueueReminderSeconds] = useState<number>(user?.queueReminderSeconds ?? 600);
  const [savingQueueReminder, setSavingQueueReminder] = useState(false);

  const handleQueueReminderSecondsBlur = async () => {
    const clamped = Math.min(
      QUEUE_REMINDER_SECONDS_MAX,
      Math.max(QUEUE_REMINDER_SECONDS_MIN, Math.round(queueReminderSeconds) || 600)
    );
    setQueueReminderSeconds(clamped);
    setSavingQueueReminder(true);
    try {
      const result = await ApiService.setQueueReminderSeconds(clamped);
      updateUser({ queueReminderSeconds: result.queueReminderSeconds });
    } catch (err) {
      console.error('[AdvisorManagerModal] No se pudo guardar el recordatorio de cola:', err);
      setError('No se pudo guardar el recordatorio de cola.');
    } finally {
      setSavingQueueReminder(false);
    }
  };

  // Timeout de inactividad de un relay YA ACTIVO — distinto de reservationMinutes (esa es la
  // ventana antes/al asignar un asesor). Mismo patrón de guardado al perder el foco.
  const [relayInactivityMinutes, setRelayInactivityMinutes] = useState<number>(user?.relayInactivityMinutes ?? 60);
  const [savingRelayInactivity, setSavingRelayInactivity] = useState(false);

  const handleRelayInactivityMinutesBlur = async () => {
    const clamped = Math.min(RELAY_INACTIVITY_MINUTES_MAX, Math.max(RELAY_INACTIVITY_MINUTES_MIN, Math.round(relayInactivityMinutes) || 60));
    setRelayInactivityMinutes(clamped);
    setSavingRelayInactivity(true);
    try {
      const result = await ApiService.setRelayInactivityMinutes(clamped);
      updateUser({ relayInactivityMinutes: result.relayInactivityMinutes });
    } catch (err) {
      console.error('[AdvisorManagerModal] No se pudo guardar el timeout de inactividad del relay:', err);
      setError('No se pudo guardar el timeout de inactividad del relay.');
    } finally {
      setSavingRelayInactivity(false);
    }
  };

  // Palabra(s) que el asesor escribe para cerrar la atención (antes fija: "FIN"/"LISTO") — lista
  // separada por comas, mismo patrón de guardado al perder el foco.
  const [finishKeywords, setFinishKeywords] = useState<string>(user?.advisorFinishKeywords ?? DEFAULT_FINISH_KEYWORDS);
  const [savingFinishKeywords, setSavingFinishKeywords] = useState(false);

  const handleFinishKeywordsBlur = async () => {
    const trimmed = finishKeywords.trim();
    if (!trimmed) {
      setFinishKeywords(DEFAULT_FINISH_KEYWORDS);
      return;
    }
    setSavingFinishKeywords(true);
    try {
      const result = await ApiService.setAdvisorFinishKeywords(trimmed);
      updateUser({ advisorFinishKeywords: result.advisorFinishKeywords });
    } catch (err) {
      console.error('[AdvisorManagerModal] No se pudo guardar la palabra de cierre:', err);
      setError('No se pudo guardar la palabra de cierre.');
    } finally {
      setSavingFinishKeywords(false);
    }
  };

  // Minutos que la IA queda muda para un cliente DESPUÉS de que se cierra su atención humana — 0 =
  // reactivar de inmediato. Mismo patrón de guardado al perder el foco.
  const [aiPauseMinutes, setAiPauseMinutes] = useState<number>(user?.aiPauseAfterAdvisorMinutes ?? 0);
  const [savingAiPause, setSavingAiPause] = useState(false);

  const handleAiPauseMinutesBlur = async () => {
    const clamped = Math.min(AI_PAUSE_AFTER_ADVISOR_MINUTES_MAX, Math.max(AI_PAUSE_AFTER_ADVISOR_MINUTES_MIN, Math.round(aiPauseMinutes) || 0));
    setAiPauseMinutes(clamped);
    setSavingAiPause(true);
    try {
      const result = await ApiService.setAiPauseAfterAdvisorMinutes(clamped);
      updateUser({ aiPauseAfterAdvisorMinutes: result.aiPauseAfterAdvisorMinutes });
    } catch (err) {
      console.error('[AdvisorManagerModal] No se pudo guardar la pausa de IA post-atención:', err);
      setError('No se pudo guardar la pausa de IA post-atención.');
    } finally {
      setSavingAiPause(false);
    }
  };

  // Los 5 campos de configuración de arriba ocupaban mucho espacio fijo y tapaban el botón
  // "Agregar asesor" (había que scrollear bastante para llegar) — quedan colapsados por default
  // adentro de este desplegable.
  const [configOpen, setConfigOpen] = useState(false);

  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const countryMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    ApiService.getAdvisors()
      .then((list) => {
        if (!cancelled) setAdvisors(list);
      })
      .catch((err) => {
        console.error('[AdvisorManagerModal] No se pudieron cargar los asesores:', err);
        if (!cancelled) setError('No se pudieron cargar los asesores.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cierra el dropdown de país al tocar afuera (mismo patrón que ContactBotSwitchesModal): es un
  // menú propio, no un <select> nativo, porque este último no puede mostrar la banderita SVG.
  useEffect(() => {
    if (!countryMenuOpen) return;
    // Ojo con Shadow DOM: `e.target` de un listener en `document` (fuera del Shadow Root donde
    // vive todo el panel) llega "retargeteado" al host del Shadow DOM para CUALQUIER clic adentro
    // — nunca al botón real que se tocó. `contains()` contra ese target siempre da falso, así que
    // este handler creía que TODO clic (incluso en un país de la lista) era "afuera" y cerraba el
    // menú antes de que el clic llegara a seleccionar nada. `composedPath()` sí devuelve el
    // camino real cruzando el límite del Shadow DOM.
    const handleClickOutside = (e: MouseEvent) => {
      const path = e.composedPath();
      if (countryMenuRef.current && !path.includes(countryMenuRef.current)) {
        setCountryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [countryMenuOpen]);

  const startCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId('new');
    setError(null);
  };

  const startEdit = (advisor: Advisor) => {
    const code = detectCountryCode(advisor.phone);
    setForm({ name: advisor.name, phone: onlyDigits(advisor.phone).slice(code.length), countryCode: code });
    setEditingId(advisor.id);
    setError(null);
  };

  const cancelForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    const localDigits = onlyDigits(form.phone);
    if (!name || !localDigits) {
      setError('Completá el nombre y el teléfono.');
      return;
    }
    const fullPhone = `${form.countryCode}${localDigits}`;
    setSaving(true);
    setError(null);
    try {
      if (editingId === 'new') {
        const created = await ApiService.createAdvisor({ name, phone: fullPhone });
        setAdvisors((prev) => [...prev, created]);
      } else if (typeof editingId === 'number') {
        const updated = await ApiService.updateAdvisor(editingId, { name, phone: fullPhone });
        setAdvisors((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
      }
      cancelForm();
    } catch (err) {
      console.error('[AdvisorManagerModal] No se pudo guardar el asesor:', err);
      setError(err instanceof Error ? err.message : 'No se pudo guardar el asesor.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (advisor: Advisor, isActive: boolean) => {
    setBusyId(advisor.id);
    setError(null);
    try {
      const updated = await ApiService.updateAdvisor(advisor.id, { isActive });
      setAdvisors((prev) => prev.map((a) => (a.id === advisor.id ? updated : a)));
    } catch (err) {
      console.error('[AdvisorManagerModal] No se pudo actualizar el estado:', err);
      setError('No se pudo actualizar ese asesor. Probá de nuevo.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (advisor: Advisor) => {
    setBusyId(advisor.id);
    setError(null);
    try {
      await ApiService.deleteAdvisor(advisor.id);
      setAdvisors((prev) => prev.filter((a) => a.id !== advisor.id));
    } catch (err) {
      console.error('[AdvisorManagerModal] No se pudo borrar el asesor:', err);
      setError(`No se pudo borrar a "${advisor.name}". Probá de nuevo.`);
    } finally {
      setBusyId(null);
    }
  };

  // Libera al cliente que este asesor tiene asignado ahora mismo — botón "Liberar" de su fila
  // (ver AdvisorService.releaseByAdvisorId en el backend: le pregunta al cliente si quedó
  // resuelto y promueve al siguiente de la cola de este asesor, igual que "FIN" por WhatsApp).
  const handleReleaseAdvisor = async (advisor: Advisor) => {
    setBusyId(advisor.id);
    setError(null);
    try {
      await ApiService.releaseAdvisor(advisor.id);
      setAdvisors((prev) => prev.map((a) => (a.id === advisor.id ? { ...a, activeClient: null } : a)));
    } catch (err) {
      console.error('[AdvisorManagerModal] No se pudo liberar al asesor:', err);
      setError(err instanceof Error ? err.message : `No se pudo liberar a "${advisor.name}". Probá de nuevo.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleResetCounts = async () => {
    setResetting(true);
    setError(null);
    try {
      await ApiService.resetAdvisorCounts();
      setAdvisors((prev) => prev.map((a) => ({ ...a, handoffCount: 0, lastHandoffAt: null })));
    } catch (err) {
      console.error('[AdvisorManagerModal] No se pudo resetear los contadores:', err);
      setError('No se pudieron resetear los contadores. Probá de nuevo.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <Modal
      title="Asesores humanos"
      onClose={onClose}
      headerColor="bg-[#9e1114]"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <button
            onClick={handleResetCounts}
            disabled={resetting || advisors.length === 0}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
            title="Vuelve a cero el contador de derivaciones de todos los asesores"
          >
            {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Resetear contadores
          </button>
          <button
            onClick={onClose}
            className="bg-[#9e1114] hover:bg-[#800d10] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            Listo
          </button>
        </div>
      }
    >
      {error && <div className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">{error}</div>}

      <button
        type="button"
        onClick={() => setConfigOpen((v) => !v)}
        className="flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
          <Settings className="w-3.5 h-3.5" /> Configuración avanzada
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${configOpen ? 'rotate-180' : ''}`} />
      </button>

      {configOpen && (
        <>
      <div className="flex flex-col gap-2 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50/60 dark:bg-slate-800/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Reserva de asesor</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              Minutos que un cliente queda con el mismo asesor antes de que el bot pueda asignarle otro.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {reservationUnlimited ? (
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 px-1">Sin límite</span>
            ) : (
              <>
                <input
                  type="number"
                  min={RESERVATION_MINUTES_MIN}
                  max={RESERVATION_MINUTES_MAX}
                  value={reservationMinutes}
                  onChange={(e) => setReservationMinutes(Number(e.target.value))}
                  onBlur={handleReservationMinutesBlur}
                  className={`${fieldInputClass} w-16 text-center`}
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400">min</span>
              </>
            )}
            {savingReservation && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
          </div>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <Toggle size="sm" checked={reservationUnlimited} disabled={savingReservation} onChange={toggleReservationUnlimited} />
          <span className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-300">
            Sin límite de tiempo (la reserva no vence sola — hay que liberarla a mano)
          </span>
        </label>
      </div>

      <div className="flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50/60 dark:bg-slate-800/60">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Recordatorio de cola</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            Cada cuánto le avisamos a un cliente en espera (sin asesor libre todavía) su posición en la fila.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min={QUEUE_REMINDER_SECONDS_MIN}
            max={QUEUE_REMINDER_SECONDS_MAX}
            value={queueReminderSeconds}
            onChange={(e) => setQueueReminderSeconds(Number(e.target.value))}
            onBlur={handleQueueReminderSecondsBlur}
            className={`${fieldInputClass} w-16 text-center`}
          />
          <span className="text-[10px] text-slate-500 dark:text-slate-400">seg</span>
          {savingQueueReminder && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50/60 dark:bg-slate-800/60">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Timeout de inactividad</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            Minutos de silencio (del asesor o del cliente) que se toleran en una charla YA en curso antes de cerrarla sola.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min={RELAY_INACTIVITY_MINUTES_MIN}
            max={RELAY_INACTIVITY_MINUTES_MAX}
            value={relayInactivityMinutes}
            onChange={(e) => setRelayInactivityMinutes(Number(e.target.value))}
            onBlur={handleRelayInactivityMinutesBlur}
            className={`${fieldInputClass} w-16 text-center`}
          />
          <span className="text-[10px] text-slate-500 dark:text-slate-400">min</span>
          {savingRelayInactivity && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50/60 dark:bg-slate-800/60">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Palabra de cierre</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            Lo que el asesor escribe para cerrar la atención — separá varias con coma (ej. FIN,LISTO,RESUELTO).
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="text"
            value={finishKeywords}
            onChange={(e) => setFinishKeywords(e.target.value)}
            onBlur={handleFinishKeywordsBlur}
            placeholder="FIN,LISTO"
            className={`${fieldInputClass} w-28 text-center`}
          />
          {savingFinishKeywords && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50/60 dark:bg-slate-800/60">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Pausa de IA post-atención</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            Minutos que la IA sigue muda para ese cliente después de que se libera al asesor — 0 = vuelve a responder de inmediato.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min={AI_PAUSE_AFTER_ADVISOR_MINUTES_MIN}
            max={AI_PAUSE_AFTER_ADVISOR_MINUTES_MAX}
            value={aiPauseMinutes}
            onChange={(e) => setAiPauseMinutes(Number(e.target.value))}
            onBlur={handleAiPauseMinutesBlur}
            className={`${fieldInputClass} w-16 text-center`}
          />
          <span className="text-[10px] text-slate-500 dark:text-slate-400">min</span>
          {savingAiPause && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
        </div>
      </div>
        </>
      )}

      {editingId !== null ? (
        <div className="flex flex-col gap-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/60 dark:bg-slate-800/60">
          <Field label="Nombre">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: María Gómez"
              className={fieldInputClass}
            />
          </Field>
          <Field label="WhatsApp">
            <div className="flex items-center gap-1.5">
              <div className="relative shrink-0" ref={countryMenuRef}>
                <button
                  type="button"
                  onClick={() => setCountryMenuOpen((v) => !v)}
                  className="flex items-center gap-1 border border-slate-300 dark:border-slate-700 rounded-lg pl-1.5 pr-1 py-1.5 text-[10.5px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs cursor-pointer transition-colors hover:border-[#9e1114]"
                >
                  <CountryFlag code={form.countryCode} />
                  <span>+{form.countryCode}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {countryMenuOpen && (
                  <div className="absolute z-10 top-full left-0 mt-1 w-44 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1">
                    {COUNTRY_CODES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, countryCode: c.code }));
                          setCountryMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer ${
                          c.code === form.countryCode ? 'bg-slate-50 dark:bg-slate-700/60 font-bold' : ''
                        }`}
                      >
                        <CountryFlag code={c.code} />
                        <span className="flex-1 truncate text-slate-700 dark:text-slate-200">{c.name}</span>
                        <span className="text-slate-400 dark:text-slate-500">+{c.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Número sin el prefijo"
                className={`${fieldInputClass} flex-1`}
              />
            </div>
          </Field>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={cancelForm}
              disabled={saving}
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.name.trim() || !form.phone.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#9e1114] hover:bg-[#800d10] disabled:opacity-40 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editingId === 'new' ? 'Agregar asesor' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startCreate}
          className="flex items-center justify-center gap-1.5 border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold py-2 rounded-xl cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar asesor
        </button>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando...
        </div>
      ) : advisors.length === 0 && editingId === null ? (
        <EmptyState>
          <span className="flex flex-col items-center gap-2">
            <Headset className="w-7 h-7 text-slate-300 dark:text-slate-600" />
            Agregá asesores para que el bot pueda derivar conversaciones automáticamente.
          </span>
        </EmptyState>
      ) : advisors.length > 0 ? (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="text-left font-bold px-2 py-1.5">Nombre</th>
                <th className="text-left font-bold px-2 py-1.5">Teléfono</th>
                <th className="text-center font-bold px-2 py-1.5">Derivaciones</th>
                <th className="text-center font-bold px-2 py-1.5">Estado</th>
                <th className="text-right font-bold px-2 py-1.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {advisors.map((advisor) => (
                <tr key={advisor.id} className="text-slate-700 dark:text-slate-300">
                  <td className="px-2 py-1.5 max-w-[110px]">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{advisor.name}</p>
                    {advisor.activeClient && (
                      <p className="text-[9.5px] text-amber-700 dark:text-amber-400 font-semibold truncate" title={`Atendiendo a ${advisor.activeClient.name}`}>
                        🟡 {advisor.activeClient.name}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="flex items-center gap-1.5 font-mono whitespace-nowrap">
                      <CountryFlag code={detectCountryCode(advisor.phone)} />+{onlyDigits(advisor.phone)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center font-semibold">{advisor.handoffCount}</td>
                  <td className="px-2 py-1.5 text-center">
                    <Toggle size="sm" checked={advisor.isActive} disabled={busyId === advisor.id} onChange={(v) => toggleActive(advisor, v)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleReleaseAdvisor(advisor)}
                        disabled={busyId === advisor.id || !advisor.activeClient}
                        className="p-1 rounded-md text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        title={advisor.activeClient ? `Liberar — atendiendo a ${advisor.activeClient.name}` : 'No tiene ningún cliente asignado ahora'}
                      >
                        {busyId === advisor.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => startEdit(advisor)}
                        disabled={busyId === advisor.id}
                        className="p-1 rounded-md text-slate-400 hover:text-[#9e1114] dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(advisor)}
                        disabled={busyId === advisor.id}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer transition-colors"
                        title="Eliminar"
                      >
                        {busyId === advisor.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Modal>
  );
};

export default AdvisorManagerModal;

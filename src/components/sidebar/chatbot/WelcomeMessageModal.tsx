import React, { useState } from 'react';
import { Loader2, MessageSquareText, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { fieldInputClass } from '@/components/ui/Field';
import { ApiService } from '@/services/api.service';
import { useAuth } from '@/state/AuthContext';

// Mismos límites que valida el backend (PUT /api/whatsapp/welcome-message), en minutos.
const WELCOME_INACTIVITY_MINUTES_MIN = 1;
const WELCOME_INACTIVITY_MINUTES_MAX = 43200; // 30 días
const WELCOME_MESSAGE_MAX_LEN = 1500;
// Lo que manda el backend si el campo queda vacío (DEFAULT_WELCOME_MESSAGE) — acá solo de placeholder.
const WELCOME_MESSAGE_PLACEHOLDER =
  '¡Hola, {nombre}! 👋 Te damos la bienvenida.\n\nSoy el asistente virtual y estoy para ayudarte con tus consultas. Si hay algo que no pueda resolver, te paso con una persona de nuestro equipo.\n\n¿En qué te puedo ayudar?';

// Mismos límites que valida el backend (PUT /api/whatsapp/stop-command), en minutos.
const STOP_COMMAND_MINUTES_MIN = 0;
const STOP_COMMAND_MINUTES_MAX = 525600; // 1 año
const STOP_COMMAND_MESSAGE_MAX_LEN = 1500;
const STOP_COMMAND_MESSAGE_PLACEHOLDER =
  'Listo, no te vamos a volver a escribir. Si necesitás ayuda, escribinos cuando quieras.';

type TimeUnit = 'minutes' | 'hours';

// Todo se guarda en minutos (igual que el backend) — este selector es solo para mostrar/editar
// el número en la unidad que sea más cómoda, sin perder precisión por redondeos de hora.
const toDisplay = (minutes: number, unit: TimeUnit) => (unit === 'hours' ? minutes / 60 : minutes);
const toMinutes = (value: number, unit: TimeUnit) => (unit === 'hours' ? value * 60 : value);

// Configuración del mensaje de bienvenida y del comando STOP — antes vivían como una sección
// inline de ChatbotModule.tsx; se movieron a este popup (mismo patrón que AdvisorManagerModal)
// porque entre los dos ocupaban demasiado espacio fijo en el panel.
export const WelcomeMessageModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, updateUser } = useAuth();

  const welcomeEnabled = user?.welcomeMessageEnabled ?? false;
  const [welcomeText, setWelcomeText] = useState<string>(user?.welcomeMessageText ?? '');
  const [savingWelcome, setSavingWelcome] = useState(false);
  const [welcomeError, setWelcomeError] = useState<string | null>(null);

  // `welcomeMinutes` es el valor YA GUARDADO (lo que usan el switch y el texto al guardarse solos
  // al perder el foco). `welcomeDraftMinutes` es lo que se está escribiendo en el input de tiempo:
  // no se manda solo — hace falta tocar "Aplicar" para que pise al valor guardado (a pedido:
  // "si tiene 20 minutos y la cambio a 3 por medio de un botón, usar 3 en vez de 20").
  const [welcomeMinutes, setWelcomeMinutes] = useState<number>(user?.welcomeInactivityMinutes ?? 720);
  const [welcomeDraftMinutes, setWelcomeDraftMinutes] = useState<number>(user?.welcomeInactivityMinutes ?? 720);
  const [welcomeUnit, setWelcomeUnit] = useState<TimeUnit>('hours');

  const saveWelcome = async (enabled: boolean, text: string, minutes: number) => {
    const clampedMinutes = Math.min(
      WELCOME_INACTIVITY_MINUTES_MAX,
      Math.max(WELCOME_INACTIVITY_MINUTES_MIN, Math.round(minutes) || 720)
    );
    setWelcomeMinutes(clampedMinutes);
    setWelcomeDraftMinutes(clampedMinutes);
    updateUser({ welcomeMessageEnabled: enabled });
    if (!user) return;
    setSavingWelcome(true);
    setWelcomeError(null);
    try {
      const result = await ApiService.setWelcomeMessage({ enabled, text: text.trim(), inactivityMinutes: clampedMinutes });
      updateUser({
        welcomeMessageEnabled: result.welcomeMessageEnabled,
        welcomeMessageText: result.welcomeMessageText,
        welcomeInactivityMinutes: result.welcomeInactivityMinutes,
      });
    } catch (err) {
      console.error('[WelcomeMessageModal] No se pudo guardar el mensaje de bienvenida:', err);
      setWelcomeError('No se pudo guardar el mensaje de bienvenida.');
    } finally {
      setSavingWelcome(false);
    }
  };

  const welcomeDraftDirty = welcomeDraftMinutes !== welcomeMinutes;
  const welcomeDisplayValue = toDisplay(welcomeDraftMinutes, welcomeUnit);

  const stopEnabledMinutesInitial = user?.stopCommandMinutes ?? 0;
  const [stopKeyword, setStopKeyword] = useState<string>(user?.stopCommandKeyword ?? 'STOP');
  const [stopMessage, setStopMessage] = useState<string>(user?.stopCommandMessage ?? '');
  const [stopMinutes, setStopMinutes] = useState<number>(stopEnabledMinutesInitial);
  const [stopDraftMinutes, setStopDraftMinutes] = useState<number>(stopEnabledMinutesInitial);
  const [stopUnit, setStopUnit] = useState<TimeUnit>('hours');
  const [savingStop, setSavingStop] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);

  const saveStopCommand = async (keyword: string, minutes: number, message: string) => {
    const trimmedKeyword = keyword.trim() || 'STOP';
    const clampedMinutes = Math.min(STOP_COMMAND_MINUTES_MAX, Math.max(STOP_COMMAND_MINUTES_MIN, Math.round(minutes) || 0));
    setStopKeyword(trimmedKeyword);
    setStopMinutes(clampedMinutes);
    setStopDraftMinutes(clampedMinutes);
    if (!user) return;
    setSavingStop(true);
    setStopError(null);
    try {
      const result = await ApiService.setStopCommand({ keyword: trimmedKeyword, minutes: clampedMinutes, message: message.trim() });
      updateUser({
        stopCommandKeyword: result.stopCommandKeyword,
        stopCommandMinutes: result.stopCommandMinutes,
        stopCommandMessage: result.stopCommandMessage,
      });
    } catch (err) {
      console.error('[WelcomeMessageModal] No se pudo guardar el comando STOP:', err);
      setStopError('No se pudo guardar el comando STOP.');
    } finally {
      setSavingStop(false);
    }
  };

  const stopDraftDirty = stopDraftMinutes !== stopMinutes;
  const stopDisplayValue = toDisplay(stopDraftMinutes, stopUnit);

  return (
    <Modal
      title="Mensaje de bienvenida"
      onClose={onClose}
      headerColor="bg-[#9e1114]"
      footer={
        <button
          onClick={onClose}
          className="bg-[#9e1114] hover:bg-[#800d10] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors ml-auto"
        >
          Listo
        </button>
      }
    >
      <div className="flex flex-col gap-2 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50/60 dark:bg-slate-800/60">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-200">
            <MessageSquareText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            Presentación del bot
            {savingWelcome && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
          </span>
          <Toggle size="sm" checked={welcomeEnabled} onChange={(v) => saveWelcome(v, welcomeText, welcomeMinutes)} />
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
          Se manda con el primer mensaje del cliente, o con el primero después de un rato sin mensajes de ningún lado.
          En grupos se manda una sola vez por reactivación del grupo entero.
        </p>
        {welcomeEnabled && (
          <>
            <textarea
              rows={6}
              maxLength={WELCOME_MESSAGE_MAX_LEN}
              value={welcomeText}
              onChange={(e) => setWelcomeText(e.target.value)}
              onBlur={() => saveWelcome(welcomeEnabled, welcomeText, welcomeMinutes)}
              placeholder={WELCOME_MESSAGE_PLACEHOLDER}
              className={`${fieldInputClass} resize-y`}
            />
            <span className="text-[9.5px] text-slate-500 dark:text-slate-400 px-0.5 leading-snug">
              Usá <b>{'{nombre}'}</b> para el nombre del contacto. Vacío = texto por defecto.
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300">
                Volver a presentarse tras
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={toDisplay(WELCOME_INACTIVITY_MINUTES_MIN, welcomeUnit)}
                  max={toDisplay(WELCOME_INACTIVITY_MINUTES_MAX, welcomeUnit)}
                  value={welcomeDisplayValue}
                  onChange={(e) => setWelcomeDraftMinutes(toMinutes(Number(e.target.value), welcomeUnit))}
                  className={`${fieldInputClass} w-20 text-center`}
                />
                <select
                  value={welcomeUnit}
                  onChange={(e) => setWelcomeUnit(e.target.value as TimeUnit)}
                  className={`${fieldInputClass} py-1.5`}
                >
                  <option value="minutes">minutos</option>
                  <option value="hours">horas</option>
                </select>
                <button
                  onClick={() => saveWelcome(welcomeEnabled, welcomeText, welcomeDraftMinutes)}
                  disabled={!welcomeDraftDirty || savingWelcome}
                  title="Usar este valor en vez del guardado"
                  className="flex items-center gap-1 bg-[#9e1114] hover:bg-[#800d10] disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-[10.5px] px-2.5 py-1.5 rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  <Check className="w-3 h-3" /> Aplicar
                </button>
              </div>
            </div>
          </>
        )}
        {welcomeError && <span className="text-[9.5px] text-red-500 font-semibold px-0.5">{welcomeError}</span>}
      </div>

      <div className="flex flex-col gap-2 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50/60 dark:bg-slate-800/60">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-200">
          Comando STOP
          {savingStop && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
        </span>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
          Si un cliente escribe esta palabra en un chat individual, el bot se apaga solo para él.
        </p>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Palabra</span>
          <input
            type="text"
            value={stopKeyword}
            onChange={(e) => setStopKeyword(e.target.value)}
            onBlur={() => saveStopCommand(stopKeyword, stopMinutes, stopMessage)}
            placeholder="STOP"
            className={fieldInputClass}
          />
        </label>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300">
            Tiempo apagado (0 = siempre)
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="number"
              min={0}
              max={toDisplay(STOP_COMMAND_MINUTES_MAX, stopUnit)}
              value={stopDisplayValue}
              onChange={(e) => setStopDraftMinutes(toMinutes(Number(e.target.value), stopUnit))}
              className={`${fieldInputClass} w-20 text-center`}
            />
            <select
              value={stopUnit}
              onChange={(e) => setStopUnit(e.target.value as TimeUnit)}
              className={`${fieldInputClass} py-1.5`}
            >
              <option value="minutes">minutos</option>
              <option value="hours">horas</option>
            </select>
            <button
              onClick={() => saveStopCommand(stopKeyword, stopDraftMinutes, stopMessage)}
              disabled={!stopDraftDirty || savingStop}
              title="Usar este valor en vez del guardado"
              className="flex items-center gap-1 bg-[#9e1114] hover:bg-[#800d10] disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-[10.5px] px-2.5 py-1.5 rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              <Check className="w-3 h-3" /> Aplicar
            </button>
          </div>
        </div>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Mensaje para el cliente
          </span>
          <textarea
            rows={3}
            maxLength={STOP_COMMAND_MESSAGE_MAX_LEN}
            value={stopMessage}
            onChange={(e) => setStopMessage(e.target.value)}
            onBlur={() => saveStopCommand(stopKeyword, stopMinutes, stopMessage)}
            placeholder={STOP_COMMAND_MESSAGE_PLACEHOLDER}
            className={`${fieldInputClass} resize-y`}
          />
        </label>
        <span className="text-[9.5px] text-slate-500 dark:text-slate-400 px-0.5 leading-snug">
          Usá <b>{'{palabra}'}</b> para la palabra clave y <b>{'{tiempo}'}</b> para la duración configurada
          (ej: "20 minutos", "3 horas", "siempre"). Vacío = texto por defecto.
        </span>
        {stopError && <span className="text-[9.5px] text-red-500 font-semibold px-0.5">{stopError}</span>}
      </div>
    </Modal>
  );
};

export default WelcomeMessageModal;

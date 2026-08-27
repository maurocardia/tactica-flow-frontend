import React, { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { ApiService } from '@/services/api.service';
import { DOMService } from '@/services/dom.service';
import { useAppState } from '@/state/AppStateContext';

const REPETITIONS: { label: string; value: 'once' | 'daily' | 'weekly' | 'monthly' }[] = [
  { label: 'Una vez', value: 'once' },
  { label: 'Diario', value: 'daily' },
  { label: 'Semanal', value: 'weekly' },
  { label: 'Mensual', value: 'monthly' }
];

export const ScheduleMessageModal: React.FC<{ onClose: () => void; contactName: string }> = ({ onClose, contactName }) => {
  const { setScheduledMessages } = useAppState();
  const [text, setText] = useState('');
  const [phone, setPhone] = useState('');
  const [datetime, setDatetime] = useState(() => {
    const d = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos en el futuro por defecto
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [recurrence, setRecurrence] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [stopIfReplies, setStopIfReplies] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Auto-detectar teléfono del chat activo al abrir
  useEffect(() => {
    const detectPhone = async () => {
      // 1. Detectar desde el DOM de WhatsApp Web (data-id de mensajes o header)
      const domPhone = DOMService.getChatPhone();
      if (domPhone) {
        setPhone(domPhone);
        return;
      }

      // 2. Si contactName tiene dígitos directamente (ej: +54 9 11...)
      const digitsInName = (contactName || '').replace(/[^0-9]/g, '');
      if (digitsInName.length >= 8) {
        setPhone(digitsInName);
        return;
      }

      // 3. Buscar en la base de datos de conversaciones sincronizadas
      try {
        const convs = await ApiService.getConversations();
        const found = convs.find(
          (c) =>
            c.name?.toLowerCase() === (contactName || '').toLowerCase() ||
            c.phone === contactName ||
            (contactName && c.name && contactName.toLowerCase().includes(c.name.toLowerCase()))
        );
        if (found && found.phone) {
          setPhone(found.phone.replace(/[^0-9]/g, ''));
        }
      } catch (err) {
        console.warn('[ScheduleMessageModal] No se pudo obtener teléfono de la DB:', err);
      }
    };

    detectPhone();
  }, [contactName]);

  const save = async () => {
    if (!text.trim() || !datetime) {
      setError('Por favor completa la fecha de envío y el mensaje.');
      return;
    }

    setSaving(true);
    setError(null);

    const targetPhone = phone.trim() || contactName.replace(/[^0-9]/g, '') || '5491100000000';

    try {
      const created = await ApiService.createScheduledJob({
        contactName: contactName || 'Contacto',
        phone: targetPhone,
        messageText: text.trim(),
        executeAt: new Date(datetime).toISOString(),
        recurrence,
        stopOnReply: stopIfReplies
      });

      // Sincronizar también con estado local
      setScheduledMessages((prev) => [
        {
          id: `sched-${created?.id || Date.now()}`,
          contactName: contactName || 'Contacto',
          scope: 'este',
          text: text.trim(),
          datetimeLabel: new Date(datetime).toLocaleString('es-AR'),
          recurrenceLabel: REPETITIONS.find((r) => r.value === recurrence)?.label || 'Una vez',
          active: true,
        },
        ...prev,
      ]);

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('[ScheduleMessageModal] Error:', err);
      setError(err.message || 'Error al programar el mensaje en el servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Programar mensaje de WhatsApp"
      onClose={onClose}
      footer={
        <button
          onClick={save}
          disabled={!text || saving || success}
          className="bg-[#9e1114] hover:bg-[#850f11] disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {success && <Check className="w-3.5 h-3.5" />}
          {success ? '¡Programado con éxito!' : 'Programar mensaje'}
        </button>
      }
    >
      <div className="flex flex-col gap-3 text-xs">
        <p className="text-slate-500 bg-slate-50 rounded-lg p-2.5">
          El servidor de Tactica Flow enviará este mensaje automáticamente por WhatsApp a la fecha indicada, incluso si cerrás el navegador.
        </p>

        {error && (
          <div className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
            {error}
          </div>
        )}

        <Field label="Contacto / Destinatario">
          <input
            type="text"
            className={fieldInputClass}
            value={contactName}
            disabled
          />
        </Field>

        <Field label="Teléfono de destino (con código de país)">
          <input
            type="text"
            className={fieldInputClass}
            placeholder="Ej: 5491123456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>

        <Field label="Fecha y hora de envío">
          <input
            type="datetime-local"
            className={fieldInputClass}
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
          />
        </Field>

        <Field label="Repetición periódica">
          <select
            className={fieldInputClass}
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as any)}
          >
            {REPETITIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Mensaje a enviar">
          <textarea
            className={fieldInputClass}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe el mensaje que se enviará automáticamente..."
          />
        </Field>

        <label className="flex items-center gap-2 text-[11px] text-slate-700 font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={stopIfReplies}
            onChange={(e) => setStopIfReplies(e.target.checked)}
            className="rounded text-[#9e1114] focus:ring-[#9e1114]"
          />
          <span>Detener envío si el contacto responde un mensaje antes</span>
        </label>
      </div>
    </Modal>
  );
};

export default ScheduleMessageModal;


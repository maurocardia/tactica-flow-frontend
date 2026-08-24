import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrototypeNotice } from '@/components/ui/PrototypeNotice';
import { useAppState } from '@/state/AppStateContext';
import { useModal } from '@/state/ModalContext';
import { ScheduledItemRow } from './ScheduledItemRow';

type PaneTab = 'msgs' | 'secs';
type Scope = 'este' | 'otro';

export const ScheduledModal: React.FC<{ onClose: () => void; contactName: string }> = ({ onClose, contactName }) => {
  const { scheduledMessages, setScheduledMessages, sequences, setSequences } = useAppState();
  const { openModal, payload } = useModal();
  const initialTab = (payload as { tab?: PaneTab } | null)?.tab;
  const [tab, setTab] = useState<PaneTab>(initialTab ?? 'msgs');
  const [scope, setScope] = useState<Scope>('este');

  const messages = scope === 'este' ? scheduledMessages.filter((m) => m.contactName === contactName) : scheduledMessages;
  const seqs = scope === 'este' ? sequences.filter((s) => s.contactName === contactName) : sequences;

  return (
    <Modal title="Programados y secuencias" onClose={onClose} maxWidth="max-w-[460px]">
      <PrototypeNotice text="Próximamente: los mensajes y secuencias programados todavía no se envían solos a la hora indicada." />
      <Tabs
        tabs={[
          { id: 'msgs', label: 'Mensajes programados' },
          { id: 'secs', label: 'Secuencias' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <select
        className="self-start border border-slate-300 rounded-md px-2 py-1 text-[11px] bg-white text-slate-800 [color-scheme:light]"
        value={scope}
        onChange={(e) => setScope(e.target.value as Scope)}
      >
        <option value="este">Este contacto ({contactName})</option>
        <option value="otro">Todos los contactos</option>
      </select>

      {tab === 'msgs' ? (
        <div className="flex flex-col gap-2">
          {messages.length === 0 ? (
            <EmptyState>No hay mensajes programados.</EmptyState>
          ) : (
            messages.map((m) => (
              <ScheduledItemRow
                key={m.id}
                icon="clock"
                title={m.text.slice(0, 40) || 'Mensaje programado'}
                meta={`${m.contactName} · ${m.datetimeLabel} · ${m.recurrenceLabel}`}
                active={m.active}
                onToggle={() => setScheduledMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, active: !x.active } : x)))}
                onEdit={() => openModal('schedule-message')}
              />
            ))
          )}
          <button
            onClick={() => openModal('schedule-message')}
            className="flex items-center justify-center gap-1.5 border border-dashed border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold text-xs py-2 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> Programar mensaje
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {seqs.length === 0 ? (
            <EmptyState>No hay secuencias activas.</EmptyState>
          ) : (
            seqs.map((s) => (
              <ScheduledItemRow
                key={s.id}
                icon="repeat"
                title={s.name}
                meta={`${s.contactName} · ${s.stepsCount} pasos`}
                active={s.active}
                onToggle={() => setSequences((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)))}
                onEdit={() => openModal('sequence-editor')}
              />
            ))
          )}
          <button
            onClick={() => openModal('sequence-editor')}
            className="flex items-center justify-center gap-1.5 border border-dashed border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold text-xs py-2 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva secuencia
          </button>
        </div>
      )}
    </Modal>
  );
};

export default ScheduledModal;

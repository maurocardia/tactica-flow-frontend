import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiService } from '@/services/api.service';
import { useAppState } from '@/state/AppStateContext';
import { useModal } from '@/state/ModalContext';
import { ScheduledItemRow } from './ScheduledItemRow';

type PaneTab = 'msgs' | 'secs';
type Scope = 'este' | 'otro';

export const ScheduledModal: React.FC<{ onClose: () => void; contactName: string }> = ({ onClose, contactName }) => {
  const { sequences, setSequences } = useAppState();
  const { openModal, payload } = useModal();
  const initialTab = (payload as { tab?: PaneTab } | null)?.tab;
  const [tab, setTab] = useState<PaneTab>(initialTab ?? 'msgs');
  const [scope, setScope] = useState<Scope>('este');
  const [backendJobs, setBackendJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const jobs = await ApiService.getScheduledJobs();
      setBackendJobs(jobs || []);
    } catch (err) {
      console.error('[ScheduledModal] Error cargando jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'msgs') {
      loadJobs();
    }
  }, [tab]);

  const handleCancelJob = async (id: number) => {
    try {
      await ApiService.cancelScheduledJob(id);
      setBackendJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'cancelled' } : j)));
    } catch (err) {
      console.error('[ScheduledModal] Error cancelando job:', err);
    }
  };

  const handleDeleteJob = async (id: number) => {
    if (!confirm('¿Eliminar este mensaje programado?')) return;
    try {
      await ApiService.deleteScheduledJob(id);
      setBackendJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err) {
      console.error('[ScheduledModal] Error eliminando job:', err);
    }
  };

  const filteredJobs = scope === 'este'
    ? backendJobs.filter((j) => j.contact_name === contactName || j.phone?.includes(contactName.replace(/[^0-9]/g, '')))
    : backendJobs;

  const seqs = scope === 'este' ? sequences.filter((s) => s.contactName === contactName) : sequences;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
            <Clock className="w-3 h-3" /> Pendiente
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="w-3 h-3" /> Enviado
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
            <XCircle className="w-3 h-3" /> Cancelado
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
            <AlertCircle className="w-3 h-3" /> Falló
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Modal title="Programados y secuencias" onClose={onClose} maxWidth="max-w-[480px]">
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
        <div className="flex flex-col gap-2.5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando mensajes programados...
            </div>
          ) : filteredJobs.length === 0 ? (
            <EmptyState>No hay mensajes programados en el servidor.</EmptyState>
          ) : (
            <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-0.5">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="border border-slate-200 rounded-xl p-3 bg-white flex flex-col gap-1.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">{job.contact_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({job.phone})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(job.status)}
                      {job.status === 'pending' && (
                        <button
                          onClick={() => handleCancelJob(job.id)}
                          className="text-[10.5px] text-red-600 hover:text-red-700 font-semibold px-1.5 py-0.5 rounded hover:bg-red-50"
                          title="Cancelar envío automático"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-2 leading-relaxed">
                    "{job.message_text}"
                  </p>

                  <div className="flex items-center justify-between text-[10.5px] text-slate-400">
                    <span>
                      📅 Envío: {new Date(job.execute_at).toLocaleString('es-AR')} ({job.recurrence === 'once' ? 'Una vez' : job.recurrence})
                    </span>
                    {job.stop_on_reply && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        Se detiene si responde
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => openModal('schedule-message')}
            className="flex items-center justify-center gap-1.5 border border-dashed border-red-300 hover:bg-red-50/50 text-[#9e1114] font-semibold text-xs py-2 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Programar nuevo mensaje
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


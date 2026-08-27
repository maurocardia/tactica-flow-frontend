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
    <Modal
      title="Programados y secuencias"
      onClose={onClose}
      maxWidth="max-w-[480px]"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          {tab === 'msgs' ? (
            <button
              onClick={() => openModal('schedule-message')}
              className="flex items-center gap-1.5 bg-[#9e1114] hover:bg-[#800d10] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" /> Programar mensaje
            </button>
          ) : (
            <button
              onClick={() => openModal('sequence-editor')}
              className="flex items-center gap-1.5 bg-[#9e1114] hover:bg-[#800d10] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" /> Nueva secuencia
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      }
    >
      <Tabs
        tabs={[
          { id: 'msgs', label: 'Mensajes programados' },
          { id: 'secs', label: 'Secuencias' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <select
        className="self-start border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs [color-scheme:light] focus:outline-none focus:border-red-500"
        value={scope}
        onChange={(e) => setScope(e.target.value as Scope)}
      >
        <option value="este">Este contacto ({contactName})</option>
        <option value="otro">Todos los contactos</option>
      </select>

      {tab === 'msgs' ? (
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando mensajes programados...
            </div>
          ) : filteredJobs.length === 0 ? (
            <EmptyState>No hay mensajes programados en el servidor.</EmptyState>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 bg-white dark:bg-slate-800/90 flex flex-col gap-2 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{job.contact_name}</span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono font-medium">({job.phone})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(job.status)}
                      {job.status === 'pending' && (
                        <button
                          onClick={() => handleCancelJob(job.id)}
                          className="text-[11px] text-red-600 dark:text-red-400 hover:text-red-700 font-bold px-2 py-0.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/60 cursor-pointer transition-colors"
                          title="Cancelar envío automático"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 leading-relaxed font-medium">
                    "{job.message_text}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    <span>
                      📅 Envío: {new Date(job.execute_at).toLocaleString('es-AR')} ({job.recurrence === 'once' ? 'Una vez' : job.recurrence})
                    </span>
                    {job.stop_on_reply && (
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                        Se detiene si responde
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
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
        </div>
      )}
    </Modal>
  );
};

export default ScheduledModal;

